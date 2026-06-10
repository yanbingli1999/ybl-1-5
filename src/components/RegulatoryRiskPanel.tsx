import { useGameStore } from '@/store/useGameStore'
import { getRiskLevelLabel, getViolationTypeLabel } from '@/data/gameData'
import { ShieldAlert, AlertTriangle, FileCheck, Scale, CheckCircle2, X } from 'lucide-react'

export default function RegulatoryRiskPanel() {
  const regulatoryRisk = useGameStore(s => s.regulatoryRisk)
  const violationRecords = useGameStore(s => s.violationRecords)
  const auditRecords = useGameStore(s => s.auditRecords)
  const triggerRandomAudit = useGameStore(s => s.triggerRandomAudit)
  const clearCurrentRectification = useGameStore(s => s.clearCurrentRectification)

  const riskInfo = getRiskLevelLabel(regulatoryRisk.currentRiskLevel, regulatoryRisk.maxRiskLevel)
  const unresolvedCount = violationRecords.filter(v => !v.resolved).length
  const recentViolations = [...violationRecords].reverse().slice(0, 3)

  const progressPercent = (regulatoryRisk.currentRiskLevel / regulatoryRisk.maxRiskLevel) * 100
  const progressColor =
    progressPercent < 40 ? 'bg-green-500' :
    progressPercent < 60 ? 'bg-yellow-500' :
    progressPercent < 80 ? 'bg-orange-500' : 'bg-red-500'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-widest text-gray-400 uppercase flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3" />
          星际监管
        </h3>
        <button
          onClick={triggerRandomAudit}
          className="text-[10px] px-2 py-0.5 rounded border border-purple-700/40 text-purple-400 bg-purple-900/30 hover:bg-purple-900/50 transition-colors"
          title="模拟抽查"
        >
          模拟抽查
        </button>
      </div>

      <div className="p-2.5 rounded-lg border border-gray-700/40 bg-gray-800/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${riskInfo.color}`}>
            {riskInfo.label}
          </span>
          <span className="text-[10px] text-gray-500">
            {regulatoryRisk.currentRiskLevel} / {regulatoryRisk.maxRiskLevel}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-700/60 overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-500 transition-colors`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-gray-800/40 border border-gray-700/30">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-0.5">
            <AlertTriangle className="w-2.5 h-2.5 text-orange-400" />
            待处理违规
          </div>
          <span className={`text-lg font-display ${unresolvedCount > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            {unresolvedCount}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-gray-800/40 border border-gray-700/30">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-0.5">
            <FileCheck className="w-2.5 h-2.5 text-purple-400" />
            已完成审查
          </div>
          <span className="text-lg font-display text-purple-400">
            {regulatoryRisk.auditsCompleted}
          </span>
        </div>
      </div>

      {regulatoryRisk.currentRectifications.length > 0 && (
        <div className="p-2 rounded-lg bg-red-900/20 border border-red-800/40 space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
            <Scale className="w-3 h-3" />
            待完成整改 ({regulatoryRisk.currentRectifications.length})
          </div>
          <div className="space-y-1">
            {regulatoryRisk.currentRectifications.map((rect, i) => (
            <div key={i} className="flex items-start gap-1.5 p-1.5 rounded bg-gray-800/50 border border-gray-700/30">
              <p className="text-[10px] text-gray-300 flex-1 leading-relaxed">
                {rect}
              </p>
              <button
                onClick={() => clearCurrentRectification(i)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-green-900/40 text-green-500 transition-colors"
                title="标记完成"
              >
                <CheckCircle2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          </div>
        </div>
      )}

      {recentViolations.length > 0 && (
        <div className="p-2 rounded-lg bg-gray-800/40 border border-gray-700/30 space-y-1.5">
          <div className="text-[10px] text-gray-500">最近违规记录</div>
          <div className="space-y-1">
            {recentViolations.map(v => (
              <div key={v.id} className="text-[10px] flex items-start gap-1">
                <span className={`px-1 py-0.5 rounded text-[9px] whitespace-nowrap ${
                  v.violationType === 'misdiagnosis' ? 'bg-red-900/40 text-red-300' :
                  v.violationType === 'expired_medicine' && v.description.includes('过期') ? 'bg-orange-900/40 text-orange-300' :
                  v.violationType === 'expired_medicine' ? 'bg-purple-900/40 text-purple-300' :
                  v.violationType === 'broken_equipment' ? 'bg-yellow-900/40 text-yellow-300' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {getViolationTypeLabel(v.violationType, v.description)}
                </span>
                <span className="text-gray-400 line-clamp-1">
                  {v.petName ? `${v.petName}: ` : ''}{v.description.slice(0, 30)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {regulatoryRisk.totalFinesPaid > 0 && (
        <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
          <span>累计罚款</span>
          <span className="text-red-400">-{regulatoryRisk.totalFinesPaid} ⬡</span>
        </div>
      )}
    </div>
  )
}
