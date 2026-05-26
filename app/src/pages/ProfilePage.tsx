import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { User, Lock, CheckCircle, AlertCircle, Mail, Shield, Loader2, Camera } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function ProfilePage() {
    const { user, updatePassword, updateProfile, uploadAvatar, isLoading } = useAppStore();
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile form
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);


    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsUpdatingProfile(true);
            await updateProfile({ name, email });
            toast.success(t('profile.profile_updated'));
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(t(typeof msg === 'string' ? msg : 'common.something_went_wrong') || 'Failed to update profile');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingAvatar(true);
            await uploadAvatar(file);
            toast.success(t('profile.profile_updated'));
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(t(typeof msg === 'string' ? msg : 'common.something_went_wrong') || 'Failed to upload photo');
        } finally {
            setIsUploadingAvatar(false);
        }
    };


    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            toast.error(t('profile.password_min_length'));
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error(t('profile.passwords_mismatch'));
            return;
        }

        try {
            setIsUpdatingPassword(true);
            await updatePassword(currentPassword, newPassword);
            toast.success(t('profile.password_updated'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(t(typeof msg === 'string' ? msg : 'common.something_went_wrong') || 'Failed to update password');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    if (isLoading && !user) {
        return (
            <div className="animate-fade-in space-y-6 max-w-4xl">
                <div className="page-header space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <div className="md:col-span-2 space-y-6">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6 max-w-4xl">
            <div className="page-header">
                <h1 className="page-title">{t('profile.title')}</h1>
                <p className="page-description">{t('profile.description')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Avatar & Quick Info */}
                <div className="space-y-6">
                    <div className="rounded-xl border bg-card p-6 flex flex-col items-center">
                        <div className="relative group">
                            <div className="relative h-32 w-32 rounded-full border-4 border-background overflow-hidden bg-muted flex items-center justify-center shadow-inner">
                                {user?.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user?.name || 'User'}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-4xl font-bold text-primary">
                                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                                {isUploadingAvatar && (
                                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                                className="absolute bottom-0 right-0 h-9 w-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                                title={t('profile.change_avatar')}
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                        </div>

                        <div className="mt-4 text-center">
                            <h2 className="text-xl font-bold">{user?.name || t('profile.account_details')}</h2>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>

                        <div className="mt-6 w-full space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                    <Shield className="h-3.5 w-3.5" />
                                    {t('profile.role')}
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${user?.role === 'ADMIN' ? 'bg-primary/10 text-primary' :
                                    user?.role === 'ACCOUNTANT' ? 'bg-accent/10 text-accent' :
                                        'bg-muted text-muted-foreground'
                                    }`}>
                                    {typeof user?.role === 'string' ? user?.role : 'USER'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Forms */}
                <div className="md:col-span-2 space-y-6">
                    {/* Account Details Form */}
                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <h2 className="font-semibold text-sm">{t('profile.account_details')}</h2>
                        </div>
                        <form onSubmit={handleProfileUpdate} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('profile.full_name')}</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                        placeholder={t('profile.full_name_placeholder', 'Full Name')}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('profile.email')}</label>
                                    <div className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed select-all">
                                        {user?.email}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isUpdatingProfile}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {isUpdatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {t('profile.update_profile')}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Password Form */}
                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                            <Lock className="h-4 w-4 text-warning" />
                            <h2 className="font-semibold text-sm">{t('profile.change_password')}</h2>
                        </div>
                        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">{t('profile.current_password')}</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('profile.new_password')}</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">{t('profile.confirm_password')}</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isUpdatingPassword}
                                    className="inline-flex items-center gap-2 rounded-lg bg-warning text-warning-foreground px-6 py-2 text-sm font-medium hover:bg-warning/90 transition-all disabled:opacity-50"
                                >
                                    {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {t('profile.update_password')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
