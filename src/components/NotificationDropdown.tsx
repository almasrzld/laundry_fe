'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  Truck,
  Sparkles,
  CheckCircle2,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useNotificationsQuery,
  useUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  NotificationItem,
} from '@/hooks/useNotificationQuery';
import { cn } from '@/lib/utils';

function formatTimeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} mnt lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(dateStr));
  } catch (_) {
    return 'Baru saja';
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'order_created':
      return {
        icon: ShoppingBag,
        bgColor: 'bg-sky-100 text-sky-700 border-sky-200',
      };
    case 'courier_assigned':
      return {
        icon: Truck,
        bgColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    case 'order_ready':
      return {
        icon: Sparkles,
        bgColor: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    case 'order_completed':
      return {
        icon: CheckCircle2,
        bgColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      };
    default:
      return {
        icon: Info,
        bgColor: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

export const NotificationDropdown: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  const { data: notifications = [], isLoading } = useNotificationsQuery(20);
  const { data: unreadData } = useUnreadNotificationCountQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const unreadCount = unreadData?.unread_count || 0;

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    setIsOpen(false);

    if (notif.order_id || notif.orders_id) {
      const orderParam = String(notif.order_id || notif.orders_id);
      router.push(`/order/${encodeURIComponent(orderParam)}/edit`);
    }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllReadMutation.mutate();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer outline-none"
          title="Notifikasi Sistem"
        >
          <Bell size={19} className="transition-transform active:scale-95 text-slate-600 hover:text-slate-900" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-2xs leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 rounded-2xl shadow-xl border border-slate-200 bg-white overflow-hidden z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/90 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900">Notifikasi</h4>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-800 rounded-full">
                {unreadCount} baru
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck size={13} />
              <span>Tandai semua dibaca</span>
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
          {isLoading && notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Memuat notifikasi...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center px-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-700">Belum ada notifikasi</p>
              <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto">
                Semua pembaruan pesanan dan kurir akan muncul di sini.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon: IconComp, bgColor } = getNotificationIcon(notif.type);
              const isUnread = !notif.is_read;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={cn(
                    'p-3.5 flex items-start gap-3 transition-colors cursor-pointer group',
                    isUnread
                      ? 'bg-sky-50/40 hover:bg-sky-50/70'
                      : 'bg-white hover:bg-slate-50/80',
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 shadow-2xs',
                      bgColor,
                    )}
                  >
                    <IconComp size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={cn(
                          'text-xs truncate font-bold',
                          isUnread ? 'text-slate-900' : 'text-slate-700',
                        )}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium flex items-center gap-1">
                        <Clock size={10} />
                        <span>{formatTimeAgo(notif.created_at)}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.invoice_no && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold border border-slate-200">
                          #{notif.invoice_no}
                        </span>
                        {notif.order_status && (
                          <span className="text-[10px] font-medium text-sky-700">
                            • {notif.order_status}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0 mt-2" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push('/order');
              }}
              className="w-full py-1.5 text-[11px] font-bold text-sky-700 hover:text-sky-800 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <span>Lihat Semua Pesanan</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
