import { motion } from 'framer-motion'
import { BoltIcon, PeopleIcon } from './dashboardIcons'
import { badgeStyle } from './dashboardHelpers'
import type { ActivityItem } from './dashboardHelpers'
import { timeAgo } from './timeAgo'

type ActivityFeedProps = {
  activity: ActivityItem[]
}

export default function ActivityFeed({ activity }: ActivityFeedProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#e8e8ed]">Actividad reciente</h2>
        {activity.length > 0 && (
          <span className="text-[10px] text-[#8e8e9a] bg-white/5 px-2.5 py-0.5 rounded-full">
            {activity.length} eventos
          </span>
        )}
      </div>
      {activity.length === 0 ? (
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center text-xs text-[#8e8e9a]">
          Sin actividad reciente
        </div>
      ) : (
        <div className="bg-[#111114] border border-white/8 rounded-2xl divide-y divide-white/5 overflow-hidden">
          {activity.map((item, i) => (
            <ActivityRow key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const isUser = item.type === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-[var(--hc-blue-500)]/15' : 'bg-[#4f7cff]/15'
        }`}
      >
        <span className={`w-4 h-4 ${isUser ? 'text-[var(--hc-blue-400)]' : 'text-[#4f7cff]'}`}>
          {isUser ? <PeopleIcon /> : <BoltIcon />}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#e8e8ed] truncate">{item.title}</p>
        <p className="text-[10px] text-[#8e8e9a] truncate">{item.desc}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeStyle(item.badge)}`}>
          {item.badge}
        </span>
        <span className="text-[10px] text-[#8e8e9a] whitespace-nowrap">
          {timeAgo(item.date)}
        </span>
      </div>
    </motion.div>
  )
}
