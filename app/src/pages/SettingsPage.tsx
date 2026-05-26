import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { Save, Mail, FileText, Globe, Info, Lock, Unlock, Users, Plus, Trash2, Key, Camera, Loader2, MapPin, Phone, Landmark, CreditCard, Palette, CheckCircle, Shield, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import api, { SERVER_URL } from '@/lib/api';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxTrigger,
    ComboboxValue,
} from '@/components/ui/combobox';
import { Controller } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';

type Role = {
    id: string;
    name: string;
    description?: string;
    isSystem: boolean;
    userCount?: number;
    permissions?: string[];
};

export default function SettingsPage() {
    const {
        user,
        settings, fetchSettings, updateSettings,
        users, fetchUsers, addUser, updateUser, deleteUser, verifyPassword,
        isLoading, error
    } = useAppStore();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'company' | 'users' | 'roles'>('company');
    const [isLocked, setIsLocked] = useState(true);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<{ category: string, permissions: any[] }[]>([]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);

        setIsUploadingLogo(true);
        try {
            await api.post('/settings/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Logo uploaded successfully');
            fetchSettings();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to upload logo');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await api.get('/roles');
            setRoles(res.data.data.roles);
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        }
    };

    const fetchPermissions = async () => {
        try {
            const res = await api.get('/roles/permissions');
            setAvailablePermissions(res.data.data.permissions);
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
        }
    };

    const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData);

        if (!data.password) {
            delete data.password;
        }

        const selectedRole = roles.find(r => r.name.toUpperCase() === userRole);
        if (selectedRole) {
            data.roleId = Number(selectedRole.id);
        }
        try {
            if (editingUser) {
                await updateUser(editingUser.id, data);
                toast.success('User updated successfully');
            } else {
                await addUser(data);
                toast.success(t('settings.user_added'));
            }
            setShowAddUserModal(false);
            setEditingUser(null);
            setUserRole(roles[0]?.name.toUpperCase() || '');
        } catch (error: any) {
            const msg = error.response?.data?.message;
            toast.error(t(typeof msg === 'string' ? msg : 'common.something_went_wrong') || 'Failed to save user');
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (!confirm('Are you sure you want to delete this role?')) return;
        try {
            await api.delete(`/roles/${id}`);
            fetchRoles();
            toast.success('Role deleted successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete role');
        }
    };

    const handleSaveRole = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name'),
            description: formData.get('description'),
            permissions: selectedPermissions,
        };

        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, data);
                toast.success('Role updated successfully');
            } else {
                await api.post('/roles', data);
                toast.success('Role created successfully');
            }
            setShowAddRoleModal(false);
            setEditingRole(null);
            setSelectedPermissions([]);
            fetchRoles();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save role');
        }
    };

    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [password, setPassword] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [showAddRoleModal, setShowAddRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [viewingRole, setViewingRole] = useState<Role | null>(null);
    const [editingUser, setEditingUser] = useState<any | null>(null);

    useEffect(() => {
        fetchSettings();
        fetchUsers();
        fetchRoles();
        fetchPermissions();
    }, [fetchSettings, fetchUsers]);

    useEffect(() => {
        if (roles.length > 0 && !userRole) {
            setUserRole(roles[0].name.toUpperCase());
        }
    }, [roles, userRole]);

    const settingsSchema = z.object({
        name: z.string().min(1, 'Company name is required'),
        currency: z.string().default('MAD'),
        smtpHost: z.string().nullish(),
        smtpPort: z.coerce.number().nullish(),
        smtpUser: z.string().nullish(),
        smtpPass: z.string().nullish(),
        defaultTerms: z.string().nullish(),
        defaultNotes: z.string().nullish(),
        legalMentions: z.string().nullish(),
        address: z.string().nullish(),
        email: z.string().nullish(),
        phone: z.string().nullish(),
        iban: z.string().nullish(),
        tvaNumber: z.string().nullish(),
        defaultTVARate: z.coerce.number().nullish(),
        pdfTheme: z.string().default('MODERN'),
    });

    type SettingsFormData = z.infer<typeof settingsSchema>;

    const { register, handleSubmit, control, reset, watch, formState: { isDirty } } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
    });

    useEffect(() => {
        if (settings) {
            reset(settings);
        }
    }, [settings, reset]);

    const onSettingsSubmit = async (data: SettingsFormData) => {
        try {
            await updateSettings(data);
            setIsLocked(true);
            toast.success('Settings updated successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const handleUnlock = async () => {
        setIsUnlocking(true);
        const success = await verifyPassword(password);
        if (success) {
            setIsLocked(false);
            setShowUnlockModal(false);
            setPassword('');
        } else {
            toast.error(t('login.invalid_credentials'));
        }
        setIsUnlocking(false);
    };

    if (isLoading) {
        return (
            <div className="animate-fade-in space-y-6 max-w-6xl">
                <div className="page-header space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-4 border-b pb-1">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-32" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <div className="grid grid-cols-2 gap-6">
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => { fetchSettings(); fetchUsers(); }} />;
    }

    return (
        <div className="animate-fade-in space-y-6 max-w-6xl">
            <div className="page-header flex justify-between items-end">
                <div>
                    <h1 className="page-title">{t('settings.title')}</h1>
                    <p className="page-description">{t('settings.description')}</p>
                </div>
                {activeTab === 'company' && (
                    <button
                        onClick={() => isLocked ? setShowUnlockModal(true) : setIsLocked(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${isLocked
                            ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200 ring-1 ring-orange-200'
                            }`}
                    >
                        {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        {isLocked ? t('settings.unlock_to_edit') : t('settings.lock_settings')}
                    </button>
                )}
            </div>

            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab('company')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${activeTab === 'company'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> {t('settings.company_tab')}
                    </div>
                </button>
                {user?.role?.toUpperCase() === 'ADMIN' && (
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${activeTab === 'users'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> {t('settings.users_tab')}
                        </div>
                    </button>
                )}
                {user?.role?.toUpperCase() === 'ADMIN' && (
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${activeTab === 'roles'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" /> {t('settings.roles_tab')}
                        </div>
                    </button>
                )}
            </div>

            {activeTab === 'company' && (
                <form onSubmit={handleSubmit(onSettingsSubmit)} className="space-y-6 relative">
                    {isLocked && (
                        <div className="absolute inset-0 z-10 bg-background/5 rounded-xl transition-all" />
                    )}

                    {/* Logo Section */}
                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                            <Camera className="h-4 w-4 text-primary" />
                            <h2 className="font-semibold text-sm">{t('settings.company_logo')}</h2>
                        </div>
                        <div className="p-6 flex flex-col md:flex-row items-center gap-8">
                            <div className="relative h-28 w-28 rounded-xl border bg-muted/30 flex items-center justify-center overflow-hidden shadow-inner">
                                {settings?.logoUrl ? (
                                    <img
                                        src={`${SERVER_URL}${settings.logoUrl}`}
                                        alt="Company Logo"
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <Camera className="h-10 w-10 text-muted-foreground/30" />
                                )}
                                {isUploadingLogo && (
                                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-3">
                                <p className="text-sm text-muted-foreground max-w-lg">{t('settings.logo_description')}</p>
                                <div className="flex items-center gap-4">
                                    <label className={`inline-flex items-center gap-2 cursor-pointer bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium shadow-md transition-all ${isLocked || isUploadingLogo ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-primary/90 hover:scale-105 active:scale-95'}`}>
                                        <Plus className="h-4 w-4" />
                                        {settings?.logoUrl ? t('settings.change_logo') : t('settings.upload_logo')}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/jpeg, image/png"
                                            onChange={handleLogoUpload}
                                            disabled={isLocked || isUploadingLogo}
                                        />
                                    </label>
                                    <span className="text-[10px] text-muted-foreground mt-2 block w-full text-center sm:inline sm:mt-0 sm:text-left">
                                        Only .png and .jpg allowed (PDF Support)
                                    </span>
                                    {settings?.logoUrl && !isLocked && (
                                        <button
                                            type="button"
                                            className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
                                            onClick={async () => {
                                                try {
                                                    await api.put('/settings', { logoUrl: null });
                                                    toast.success(t('settings.logo_removed'));
                                                    fetchSettings();
                                                } catch (e) {
                                                    toast.error('Failed to remove logo');
                                                }
                                            }}
                                        >
                                            {t('clients.cancel')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* General Info */}
                        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                            <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                                <Info className="h-4 w-4 text-primary" />
                                <h2 className="font-semibold text-sm">{t('settings.general_info')}</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.company_name')}</label>
                                    <input {...register('name')} disabled={isLocked} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.currency')}</label>
                                        <Controller
                                            name="currency"
                                            control={control}
                                            render={({ field }) => (
                                                <Combobox
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    disabled={true}
                                                >
                                                    <ComboboxTrigger className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed transition-all">
                                                        <ComboboxValue placeholder={t('settings.currency')} />
                                                    </ComboboxTrigger>
                                                    <ComboboxContent>
                                                        <ComboboxList>
                                                            <ComboboxItem value="MAD">MAD (Dirham)</ComboboxItem>
                                                            <ComboboxItem value="EUR">EUR (€)</ComboboxItem>
                                                            <ComboboxItem value="USD">USD ($)</ComboboxItem>
                                                        </ComboboxList>
                                                    </ComboboxContent>
                                                </Combobox>
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.tva_rate')}</label>
                                        <input type="number" step="0.01" {...register('defaultTVARate')} disabled={isLocked} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">ICE / SIRET / Tax ID</label>
                                    <input {...register('tvaNumber')} disabled={isLocked} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                </div>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                            <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <h2 className="font-semibold text-sm">Contact & Location</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('clients.email')}</label>
                                    <input {...register('email')} disabled={isLocked} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('common.address')}</label>
                                    <textarea {...register('address')} disabled={isLocked} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SMTP Settings */}
                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            <h2 className="font-semibold text-sm">{t('settings.email_config')}</h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.smtp_host')}</label>
                                        <input {...register('smtpHost')} disabled={isLocked} placeholder="smtp.gmail.com" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                        <p className="text-[10px] text-muted-foreground">{t('settings.smtp_description')}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.smtp_port')}</label>
                                        <input {...register('smtpPort')} disabled={isLocked} type="number" placeholder="465 or 587" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                        <p className="text-[10px] text-muted-foreground">{t('settings.port_description')}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.smtp_user')}</label>
                                        <input {...register('smtpUser')} disabled={isLocked} placeholder="your-email@example.com" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.smtp_pass')}</label>
                                        <input {...register('smtpPass')} disabled={isLocked} type="password" placeholder="••••••••" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                        <p className="text-[10px] text-muted-foreground">{t('settings.gmail_hint')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Terms & Legal */}
                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h2 className="font-semibold text-sm">{t('settings.document_defaults')}</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.payment_terms')}</label>
                                    <textarea {...register('defaultTerms')} disabled={isLocked} rows={4} placeholder="e.g. Due within 30 days" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.legal_mentions')}</label>
                                    <textarea {...register('legalMentions')} disabled={isLocked} rows={4} placeholder="e.g. Registered in Casablanca, ICE: 000..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
                                </div>
                            </div>
                        </div>
                    </div>


                    {!isLocked && (
                        <div className="flex justify-end gap-3 sticky bottom-4 z-20">
                            <button
                                type="button"
                                onClick={() => {
                                    reset(settings || {});
                                    setIsLocked(true);
                                }}
                                className="rounded-lg px-6 py-2.5 text-sm font-medium border bg-background hover:bg-muted shadow-sm"
                            >
                                {t('settings.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={!isDirty}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                            >
                                <Save className="h-4 w-4" /> {t('settings.save_changes')}
                            </button>
                        </div>
                    )}
                </form>
            )}

            {activeTab === 'users' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                            <Users className="h-5 w-5 text-primary" /> {t('settings.team_members')}
                        </h2>
                        <button
                            onClick={() => {
                                setEditingUser(null);
                                setUserRole(roles[0]?.name.toUpperCase() || '');
                                setShowAddUserModal(true);
                            }}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-md active:scale-95"
                        >
                            <Plus className="h-4 w-4" /> {t('settings.add_user')}
                        </button>
                    </div>

                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-semibold uppercase text-[10px] text-muted-foreground tracking-wider">{t('settings.member', 'Member')}</th>
                                    <th className="px-6 py-4 font-semibold uppercase text-[10px] text-muted-foreground tracking-wider">{t('settings.role')}</th>
                                    <th className="px-6 py-4 font-semibold uppercase text-[10px] text-muted-foreground tracking-wider">{t('settings.created_at')}</th>
                                    <th className="px-6 py-4 text-right uppercase text-[10px] text-muted-foreground tracking-wider">{t('settings.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full border-2 border-background shadow-sm overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                                                    {u.avatarUrl ? (
                                                        <img
                                                            src={u.avatarUrl.startsWith('http') ? u.avatarUrl : `${SERVER_URL}${u.avatarUrl}`}
                                                            alt={u.name || u.email}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=random`;
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="text-[11px] font-black pointer-events-none text-primary">
                                                            {(u.name || u.email).charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-sm text-foreground truncate">{u.name || u.email.split('@')[0]}</span>
                                                    <span className="text-[10px] text-muted-foreground truncate">{u.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border-2 ${u.role?.toUpperCase() === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                u.role?.toUpperCase() === 'ACCOUNTANT' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    'bg-gray-50 text-gray-700 border-gray-100'
                                                }`}>
                                                {u.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {u.id !== user?.id && (
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(u);
                                                        setUserRole(u.role);
                                                        setShowAddUserModal(true);
                                                    }}
                                                    className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10"
                                                >
                                                    <Key className="h-4 w-4" />
                                                </button>
                                            )}
                                            {u.id !== user?.id && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(t('settings.confirm_delete_user'))) deleteUser(u.id);
                                                    }}
                                                    className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'roles' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">{t('settings.role_management')}</h2>
                        <button
                            onClick={() => { setEditingRole(null); setSelectedPermissions(['reports.view']); setShowAddRoleModal(true); }}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-md active:scale-95"
                        >
                            <Plus className="h-4 w-4" /> {t('settings.add_role')}
                        </button>
                    </div>
                    <div className="grid gap-4">
                        {roles.map((role) => (
                            <div key={role.id} className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Shield className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{role.name}</h3>
                                                {role.isSystem && (
                                                    <Badge variant="outline" className="text-[10px]">System</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{role.description}</p>
                                            <p className="text-xs text-muted-foreground">{role.userCount === 1 ? '1 user assigned' : `${role.userCount || 0} users assigned`}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setViewingRole(role)} className="text-xs p-2 rounded-lg border hover:bg-muted transition-colors">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        {role.name.toUpperCase() !== 'ADMIN' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setEditingRole(role);
                                                        setSelectedPermissions(role.permissions || []);
                                                        setShowAddRoleModal(true);
                                                    }}
                                                    className="text-xs px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRole(role.id)}
                                                    className="text-xs p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {role.permissions?.slice(0, 10).map((perm) => (
                                        <Badge key={perm} variant="secondary" className="text-[10px]">{perm.replace('.', ' ')}</Badge>
                                    ))}
                                    {(role.permissions?.length || 0) > 10 && (
                                        <Badge variant="secondary" className="text-[10px]">+{(role.permissions?.length || 0) - 10} more</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Unlock Modal */}
            <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
                <DialogContent className="sm:max-w-md border-orange-100">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-700">
                            <Lock className="h-5 w-5" />
                            {t('settings.security_verification')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {t('settings.security_verification_desc')}
                        </p>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                <Key className="h-3.5 w-3.5" /> {t('common.password')}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                autoFocus
                                className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <button
                            onClick={() => setShowUnlockModal(false)}
                            className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
                        >
                            {t('settings.cancel')}
                        </button>
                        <button
                            onClick={handleUnlock}
                            disabled={isUnlocking || !password}
                            className="px-6 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 shadow-md shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isUnlocking ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('settings.verifying')}
                                </>
                            ) : t('settings.unlock_now')}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add User Modal */}
            <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleAddUser}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5 text-primary" />
                                {editingUser ? 'Update Member Details' : t('settings.add_new_member')}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">{t('common.name', 'Full Name')}</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input name="name" type="text" defaultValue={editingUser?.name} className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder={t('common.full_name', 'Full Name')} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">{t('common.email')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input name="email" type="email" required defaultValue={editingUser?.email} className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="name@company.com" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.temp_password')}</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input name="password" type="password" required={!editingUser} className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder={editingUser ? 'Leave blank to keep current' : ''} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.role')}</label>
                                <div className="relative">
                                    <Shield className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${editingUser?.role?.toUpperCase() === 'ADMIN' ? 'opacity-50' : ''}`} />
                                    <Combobox value={userRole} onValueChange={setUserRole} disabled={editingUser?.role?.toUpperCase() === 'ADMIN'}>
                                        <ComboboxInput className="w-full pl-10" />
                                        <ComboboxContent>
                                            <ComboboxList>
                                                {roles.map((role) => (
                                                    <ComboboxItem key={role.id} value={role.name.toUpperCase()}>
                                                        {role.name}
                                                    </ComboboxItem>
                                                ))}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <button type="button" onClick={() => { setShowAddUserModal(false); setEditingUser(null); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">{t('settings.cancel')}</button>
                            <button type="submit" className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95 transition-all">{editingUser ? 'Save Changes' : t('settings.add_user')}</button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Role Permissions Modal */}
            <Dialog open={!!viewingRole} onOpenChange={(open) => !open && setViewingRole(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            {viewingRole?.name} - Permissions
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 max-h-96 overflow-y-auto">
                        <div className="flex flex-wrap gap-2">
                            {viewingRole?.permissions?.map((perm) => (
                                <Badge key={perm} variant="secondary" className="text-xs">
                                    {perm.replace('.', ' ')}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add/Edit Role Modal */}
            <Dialog open={showAddRoleModal} onOpenChange={(open) => { setShowAddRoleModal(open); if (!open) { setEditingRole(null); setSelectedPermissions(['reports.view']); } }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSaveRole} className="flex flex-col gap-6 pt-2">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                {editingRole ? 'Edit Role' : 'Add New Role'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 px-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.role_name')}</label>
                                    <input
                                        name="name"
                                        defaultValue={editingRole?.name}
                                        required
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                        placeholder="e.g. Sales Manager"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('settings.role_description')}</label>
                                    <input
                                        name="description"
                                        defaultValue={editingRole?.description}
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                        placeholder="Brief description of responsibilities"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold border-b pb-2">{t('settings.role_permissions')}</h3>
                                {availablePermissions
                                    .filter(group => !['Users', 'Settings', 'Roles'].includes(group.category))
                                    .map((group) => (
                                        <div key={group.category} className="space-y-2">
                                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{group.category}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                {(() => {
                                                    // Handle Payments grouping
                                                    if (group.category === 'Payments') {
                                                        const createPerm = group.permissions.find(p => p.name === 'payments.create');
                                                        const refundPerm = group.permissions.find(p => p.name === 'payments.refund');
                                                        const viewPerm = group.permissions.find(p => p.name === 'payments.view');

                                                        const others = group.permissions.filter(p => !['payments.create', 'payments.refund', 'payments.view'].includes(p.name));

                                                        const isProcessChecked = selectedPermissions.includes('payments.create') && selectedPermissions.includes('payments.refund');

                                                        return (
                                                            <>
                                                                {viewPerm && (
                                                                    <label key={viewPerm.name} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedPermissions.includes(viewPerm.name)}
                                                                            onChange={(e) => {
                                                                                const isChecked = e.target.checked;
                                                                                if (isChecked) {
                                                                                    setSelectedPermissions([...selectedPermissions, viewPerm.name]);
                                                                                } else {
                                                                                    // If view is unchecked, uncheck all others in category
                                                                                    setSelectedPermissions(selectedPermissions.filter(p => !p.startsWith('payments.')));
                                                                                }
                                                                            }}
                                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-medium">{t('settings.action_view')}</span>
                                                                            <span className="text-[10px] text-muted-foreground leading-tight">{viewPerm.description}</span>
                                                                        </div>
                                                                    </label>
                                                                )}

                                                                {(createPerm || refundPerm) && (
                                                                    <label key="process-payment" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isProcessChecked}
                                                                            onChange={(e) => {
                                                                                const isChecked = e.target.checked;
                                                                                const permsToAdd = ['payments.create', 'payments.refund', 'payments.view'];
                                                                                if (isChecked) {
                                                                                    setSelectedPermissions(Array.from(new Set([...selectedPermissions, ...permsToAdd])));
                                                                                } else {
                                                                                    setSelectedPermissions(selectedPermissions.filter(p => p !== 'payments.create' && p !== 'payments.refund'));
                                                                                }
                                                                            }}
                                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-medium">process payment</span>
                                                                            <span className="text-[10px] text-muted-foreground leading-tight">Record payments and process refunds</span>
                                                                        </div>
                                                                    </label>
                                                                )}

                                                                {others.map((perm) => (
                                                                    // Render any other potential payment permissions normally
                                                                    <label key={perm.name} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedPermissions.includes(perm.name)}
                                                                            onChange={(e) => {
                                                                                const isChecked = e.target.checked;
                                                                                const permName = perm.name;
                                                                                const [category, action] = permName.split('.');
                                                                                const viewPermName = `${category}.view`;

                                                                                let newPermissions = [...selectedPermissions];

                                                                                if (isChecked) {
                                                                                    newPermissions.push(permName);
                                                                                    if (action !== 'view' && !newPermissions.includes(viewPermName)) {
                                                                                        newPermissions.push(viewPermName);
                                                                                    }
                                                                                } else {
                                                                                    newPermissions = newPermissions.filter(p => p !== permName);
                                                                                    if (action === 'view') {
                                                                                        newPermissions = newPermissions.filter(p => !p.startsWith(`${category}.`));
                                                                                    }
                                                                                }
                                                                                setSelectedPermissions(Array.from(new Set(newPermissions)));
                                                                            }}
                                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-medium">{t(`settings.action_${perm.name.split('.')[1]}`)}</span>
                                                                            <span className="text-[10px] text-muted-foreground leading-tight">{perm.description}</span>
                                                                        </div>
                                                                    </label>
                                                                ))}
                                                            </>
                                                        );
                                                    }

                                                    // Standard rendering for other categories
                                                    return group.permissions.map((perm) => (
                                                        <label key={perm.name} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPermissions.includes(perm.name)}
                                                                onChange={(e) => {
                                                                    const isChecked = e.target.checked;
                                                                    const permName = perm.name;
                                                                    const [category, action] = permName.split('.');
                                                                    const viewPermName = `${category}.view`;

                                                                    let newPermissions = [...selectedPermissions];

                                                                    if (isChecked) {
                                                                        newPermissions.push(permName);
                                                                        if (action !== 'view' && !newPermissions.includes(viewPermName)) {
                                                                            newPermissions.push(viewPermName);
                                                                        }
                                                                    } else {
                                                                        newPermissions = newPermissions.filter(p => p !== permName);
                                                                        if (action === 'view') {
                                                                            newPermissions = newPermissions.filter(p => !p.startsWith(`${category}.`));
                                                                        }
                                                                    }
                                                                    setSelectedPermissions(Array.from(new Set(newPermissions)));
                                                                }}
                                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-medium">{t(`settings.action_${perm.name.split('.')[1]}`)}</span>
                                                                <span className="text-[10px] text-muted-foreground leading-tight">{perm.description}</span>
                                                            </div>
                                                        </label>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
                            <button
                                type="button"
                                onClick={() => { setShowAddRoleModal(false); setEditingRole(null); setSelectedPermissions([]); }}
                                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95 transition-all"
                            >
                                {editingRole ? 'Save Changes' : 'Create Role'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
