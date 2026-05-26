import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface SignaturePadProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureDataUrl: string) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const sigCanvas = useRef<SignatureCanvas>(null);

    const clear = () => {
        sigCanvas.current?.clear();
    };

    const save = () => {
        if (sigCanvas.current?.isEmpty()) {
            return;
        }
        const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
        if (dataUrl) {
            onSave(dataUrl);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('common.sign_document')}</DialogTitle>
                    <DialogDescription>
                        {t('common.sign_description', 'Please sign below using your mouse or touch screen.')}
                    </DialogDescription>
                </DialogHeader>
                <div className="border border-input rounded-md bg-white dark:bg-gray-100 p-2">
                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor="black"
                        canvasProps={{
                            width: 450,
                            height: 200,
                            className: 'signature-canvas w-full h-[200px]',
                        }}
                    />
                </div>
                <DialogFooter className="flex justify-between sm:justify-between w-full">
                    <Button variant="outline" onClick={clear}>
                        {t('common.clear')}
                    </Button>
                    <div className="space-x-2">
                        <Button variant="ghost" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={save}>{t('common.save_signature')}</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SignaturePad;
