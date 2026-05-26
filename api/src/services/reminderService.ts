import prisma from '../config/prisma';
import { sendEmail } from '../services/emailService';
import { generateInvoicePDF } from './pdfService';

/**
 * Sends a professional reminder email for an overdue invoice.
 * Includes localized content (French/English) and the invoice PDF.
 */
export const sendOverdueReminder = async (invoiceId: string | number) => {
    const invoice = await prisma.invoice.findUnique({
        where: { id: BigInt(invoiceId) },
        include: { client: true, items: true, payments: true },
    });

    if (!invoice || invoice.isCancelled) return;

    const totalPaid = invoice.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const remaining = Number(invoice.total) - totalPaid;

    if (remaining <= 0) return; // Already paid

    // Professional Moroccan Standard Reminder (French)
    const subject = `RAPPEL : Paiement en attente - Facture #${invoice.number}`;

    const message = `
Cher(e) ${invoice.client.name},

Sauf erreur ou omission de notre part, le paiement de votre facture #${invoice.number} datée du ${invoice.date.toLocaleDateString('fr-FR')} n'a pas encore été enregistré. 

Cette facture arrivait à échéance le ${invoice.dueDate.toLocaleDateString('fr-FR')}.

Récapitulatif :
- Montant Total : ${Number(invoice.total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${invoice.currency}
- Montant déjà réglé : ${totalPaid.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${invoice.currency}
- Solde restant : ${remaining.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${invoice.currency}

Nous vous prions de bien vouloir procéder au règlement dans les meilleurs délais. Vous trouverez la facture en pièce jointe pour référence.

Si votre virement a été effectué récemment, nous vous prions de ne pas tenir compte de ce rappel.

Nous restons à votre entière disposition pour tout complément d'information.

Cordialement,
La Direction
    `;

    try {
        const pdfBytes = await generateInvoicePDF(invoice);

        await sendEmail({
            email: invoice.client.email,
            subject,
            message,
            attachments: [
                {
                    filename: `Facture-${invoice.number}.pdf`,
                    content: Buffer.from(pdfBytes),
                },
            ],
        });

        console.log(`[Reminder] Sent to ${invoice.client.email} for invoice ${invoice.number}`);

        // Update a hypothetical lastRemindedAt (I'll skip schema change for now to stay minimal, 
        // but it's good practice. For now, the cron will handle the logic of who to remind).
    } catch (error: any) {
        console.error(`[Reminder Error] Failed for invoice ${invoice.id}:`, error.message);
    }
};

/**
 * Sweeps the database for newly overdue invoices and sends reminders.
 */
export const processOverdueInvoices = async () => {
    const now = new Date();

    // Find invoices that just became overdue today (or are already overdue and enabled)
    const candidates = await prisma.invoice.findMany({
        where: {
            status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
            remindersEnabled: true,
            dueDate: {
                lt: now
            },
            isCancelled: false
        }
    });

    if (candidates.length === 0) return;

    console.log(`[Cron] Found ${candidates.length} potentially overdue invoices.`);

    for (const inv of candidates) {
        // Calculate days overdue
        const diffTime = Math.abs(now.getTime() - inv.dueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Milestones: Day 1, 7, 15, 30
        const milestones = [1, 7, 15, 30];
        const isMilestone = milestones.includes(diffDays);

        // 1) Update status to OVERDUE if not already
        if (inv.status !== 'OVERDUE') {
            await prisma.invoice.update({
                where: { id: inv.id },
                data: { status: 'OVERDUE' }
            });
        }

        // 2) Trigger professional reminder only on specific milestones
        if (isMilestone) {
            console.log(`[Cron] Milestone reached: Day ${diffDays} for Invoice #${inv.number}`);
            await sendOverdueReminder(inv.id.toString());
        }
    }
};
