'use client';

import { useState, useEffect } from 'react';
import { supabase, Notice } from '@/lib/supabase';
import { Megaphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NoticeBar() {
    const [notice, setNotice] = useState<Notice | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Fetch latest notice
        const fetchLatestNotice = async () => {
            const { data, error } = await supabase
                .from('notices')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setNotice(data);
                setVisible(true);
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
                    setNotice(payload.new);
                    setVisible(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
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
                            <p className="text-sm font-medium text-slate-300">Live Notice</p>
                            <p className="text-white font-semibold">{notice.content}</p>
                        </div>
                        <button
                            onClick={() => setVisible(false)}
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
