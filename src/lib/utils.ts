import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start
  const e = typeof end === 'string' ? new Date(end) : end
  return `${formatDate(s)} - ${formatDate(e)}`
}

export function getEventStatus(startDate: Date | string, endDate: Date | string): 'upcoming' | 'ongoing' | 'ended' {
  const now = new Date()
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  if (now < start) return 'upcoming'
  if (now > end) return 'ended'
  return 'ongoing'
}

export function getStatusLabel(status: 'upcoming' | 'ongoing' | 'ended'): string {
  const labels = {
    upcoming: '即将开始',
    ongoing: '正在进行',
    ended: '已结束',
  }
  return labels[status]
}

export function getStatusColor(status: 'upcoming' | 'ongoing' | 'ended'): string {
  const colors = {
    upcoming: 'bg-accent text-dark',
    ongoing: 'bg-emerald-500 text-white',
    ended: 'bg-slate-500 text-white',
  }
  return colors[status]
}
