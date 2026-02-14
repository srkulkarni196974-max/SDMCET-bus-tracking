'use client';

import { useState, useEffect } from 'react';
import { supabase, Notice } from '@/lib/supabase';
import { Megaphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NOTICE_EXPIRY_MS = 20 * 60 * 1000; // 20 minutes

export default function NoticeBar() {
    const [notice, setNotice] = useState<Notice | null>(null);
    const [visible, setVisible] = useState(false);

    const isNoticeValid = (createdAt: string) => {
        const age = Date.now() - new Date(createdAt).getTime();
        return age < NOTICE_EXPIRY_MS;
    };

    const handleDismiss = () => {
        if (notice) {
            const dismissed = JSON.parse(localStorage.getItem('dismissedNotices') || '[]');
            dismissed.push(notice.id);
            localStorage.setItem('dismissedNotices', JSON.stringify(dismissed));
            setVisible(false);
        }
    };

    useEffect(() => {
        const processNotice = (data: Notice) => {
            const dismissed = JSON.parse(localStorage.getItem('dismissedNotices') || '[]');
            if (isNoticeValid(data.created_at) && !dismissed.includes(data.id)) {
                setNotice(data);
                setVisible(true);

                // Set timer to hide when it expires
                const remainingTime = NOTICE_EXPIRY_MS - (Date.now() - new Date(data.created_at).getTime());
                const timer = setTimeout(() => {
                    setVisible(false);
                }, remainingTime);

                return timer;
            }
            return null;
        };

        let expiryTimer: NodeJS.Timeout | null = null;

        // Fetch latest notice
        const fetchLatestNotice = async () => {
            const { data } = await supabase
                .from('notices')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                expiryTimer = processNotice(data);
            }
        };

        fetchLatestNotice();

        // Subscribe to new notices
        const channel = supabase
            .channel('notices_changes')
            .on(
                'postgres_changes' as any,
                { event: 'INSERT', table: 'notices' },
                (payload: { new: Notice }) => {
                    if (expiryTimer) clearTimeout(expiryTimer);
                    expiryTimer = processNotice(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (expiryTimer) clearTimeout(expiryTimer);
        };
    }, []);

    return (
        <AnimatePresence>
            {visible && notice && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-2xl px-4"
                >
                    <div className="glass-card flex items-center gap-4 p-4 !rounded-2xl border-blue-500/50 shadow-2xl shadow-blue-500/10">
                        <div className="bg-blue-600 p-2 rounded-full heartbeat">
                            <Megaphone size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-black font-medium text-slate-950">Live Notice</p>
                            <p className="text-black font-semibold">{notice.content}</p>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
