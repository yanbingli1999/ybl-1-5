import { useState } from 'react'
import { useGameStore } from '@/store/useGameStore'
import {
  getRegulation,
  getViolationTypeLabel,
  getSeverityLabel,
  regulations,
  type Regulation,
  getRiskLevelLabel,
} from '@/data/gameData'
import {
  ShieldCheck,
  ShieldAlert,
  User,
  FileText,
  Scale,
  AlertOctagon,
  Plus,
  X,
  CheckCircle,
  XCircle,
  Coins,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Sparkles,
  AlertTriangle,
  FileCheck,
  Send,
} from 'lucide-react'

export default function AuditPanel() {
  const showAuditPanel = useGameStore(s => s.showAuditPanel)
  const currentAudit = useGameStore(s => s.currentAudit)
  const auditSessionViolations = useGameStore(s => s.auditSessionViolations)
  const auditSubmissionNotes = useGameStore(s => s.auditSubmissionNotes)
  const regulatoryRisk = useGameStore(s => s.regulatoryRisk)
  const equipment = useGameStore(s => s.equipment)
  const player = useGameStore(s => s.player)

  const setAuditSubmissionNotes = useGameStore(s => s.setAuditSubmissionNotes)
  const submitAudit = useGameStore(s => s.submitAudit)
  const dismissAudit = useGameStore(s => s.dismissAudit)
  const addAuditSessionViolation = useGameStore(s => s.addAuditSessionViolation)
  const removeAuditSessionViolation = useGameStore(s => s.removeAuditSessionViolation)

  const [showAddViolation, setShowAddViolation] = useState(false)
  const [selectedRegId, setSelectedRegId] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [showResultDetails, setShowResultDetails] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!showAuditPanel || !currentAudit) return null

  const isPending = currentAudit.status === 'pending'

  const brokenEquipment = equipment.filter(e => e.status === 'damaged')

  const riskInfo = getRiskLevelLabel(regulatoryRisk.currentRiskLevel, regulatoryRisk.maxRiskLevel)

  const estimateFine = () => {
    let total = 0
    auditSessionViolations.forEach(vio => {
      const reg = getRegulation(vio.regulationId)
      if (reg) {
        const severityMultiplier = reg.severity === 'severe' ? 1.5 : reg.severity === 'moderate' ? 1 : 0.7
        total += Math.floor(reg.baseFine * severityMultiplier)
      }
    })
    const honestyBonus = auditSubmissionNotes.length > 30 ? 0.9 : 1
    return Math.floor(total * honestyBonus)
  }

  const handleAddViolation = () => {
    if (!selectedRegId) return
    const reg = getRegulation(selectedRegId)
    if (!reg) return
    const desc = customDescription.trim() || reg.description
    const riskPoints = reg.severity === 'severe' ? 12 : reg.severity === 'moderate' ? 8 : 4
    addAuditSessionViolation(selectedRegId, desc, riskPoints)
    setSelectedRegId('')
    setCustomDescription('')
    setShowAddViolation(false)
  }

  const handleSubmit = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      submitAudit()
      setIsSubmitting(false)
    }, 600)
  }

  const getStatusInfo = () => {
    switch (currentAudit.status) {
      case 'approved':
        return {
          label: '审核通过 · 放行',
          color: 'text-green-400',
          bg: 'bg-green-900/30 border-green-700/40',
          icon: <CheckCircle className="w-7 h-7" />,
        }
      case 'fined':
        return {
          label: '违规处罚 · 罚款放行',
          color: 'text-yellow-400',
          bg: 'bg-yellow-900/30 border-yellow-700/40',
          icon: <Coins className="w-7 h-7" />,
        }
      case 'rectification':
        return {
          label: '责令整改 · 待复查',
          color: 'text-red-400',
          bg: 'bg-red-900/30 border-red-700/40',
          icon: <AlertOctagon className="w-7 h-7" />,
        }
      default:
        return {
          label: '审查中 · 待提交',
          color: 'text-cyan-400',
          bg: 'bg-cyan-900/30 border-cyan-700/40',
          icon: <ClipboardList className="w-7 h-7" />,
        }
    }
  }

  const statusInfo = getStatusInfo()

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-gray-900 border-2 border-purple-700/40 rounded-2xl shadow-2xl shadow-purple-900/40">
        
        <div className={`px-5 py-4 border-b ${statusInfo.bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-display text-lg tracking-wider text-gray-100">
                    星际监管抽查
                  </h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.bg} ${statusInfo.color} border`}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-purple-400" />
                    编号 {currentAudit.auditNumber}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-cyan-400" />
                    检查员 {currentAudit.inspectorName}
                  </span>
                  <span>{formatDate(currentAudit.timestamp)}</span>
                </div>
              </div>
            </div>

            {!isPending && (
              <button
                onClick={dismissAudit}
                className="p-1.5 rounded-lg hover:bg-gray-700/60 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {isPending && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/40 text-center">
                  <div className={`text-xl font-display ${riskInfo.color}`}>
                    {riskInfo.label}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">当前风险等级</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/40 text-center">
                  <div className="text-xl font-display text-orange-400">
                    {auditSessionViolations.length}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">发现违规项</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/40 text-center">
                  <div className="text-xl font-display text-yellow-400">
                    {estimateFine()} ⬡
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">预估罚款</div>
                </div>
              </div>

              {brokenEquipment.length > 0 && (
                <div className="p-3 rounded-xl bg-orange-900/20 border border-orange-800/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-orange-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    现场检查发现设备问题（{brokenEquipment.length}台）
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {brokenEquipment.map(e => (
                      <span key={e.id} className="text-[10px] px-2 py-0.5 rounded bg-orange-900/40 text-orange-300 border border-orange-700/30">
                        {e.name}（损坏）
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm tracking-wider text-gray-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-red-400" />
                    违规记录清单
                    <span className="text-[10px] text-gray-500 font-normal tracking-normal">
                      （{auditSessionViolations.length}项）
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowAddViolation(!showAddViolation)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-purple-900/30 border border-purple-700/40 text-purple-300 hover:bg-purple-900/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    补充申报
                  </button>
                </div>

                {showAddViolation && (
                  <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-700/40 space-y-2">
                    <div className="text-[11px] text-purple-300 font-medium mb-1">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      诚实主动申报可获得10%罚款减免
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">选择违规法规</label>
                      <select
                        value={selectedRegId}
                        onChange={e => setSelectedRegId(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-gray-800/80 border border-gray-700/60 text-gray-200 focus:border-purple-500 focus:outline-none"
                      >
                        <option value="">-- 请选择适用法规 --</option>
                        {regulations.map(reg => {
                          const sev = getSeverityLabel(reg.severity)
                          return (
                            <option key={reg.id} value={reg.id}>
                              [{reg.code}] {reg.name}（{sev.label} · 基准{reg.baseFine}⬡）
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    {selectedRegId && (
                      <div className="p-2 rounded-lg bg-gray-800/60 text-[10px] text-gray-400 space-y-1">
                        <p><span className="text-gray-500">法规条款：</span>{getRegulation(selectedRegId)?.description}</p>
                        <p><span className="text-gray-500">整改要求：</span>{getRegulation(selectedRegId)?.rectificationRequirement}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">情况说明（可选）</label>
                      <textarea
                        value={customDescription}
                        onChange={e => setCustomDescription(e.target.value)}
                        placeholder="详细说明违规情况..."
                        rows={2}
                        className="w-full text-xs p-2 rounded-lg bg-gray-800/80 border border-gray-700/60 text-gray-200 placeholder-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setShowAddViolation(false)}
                        className="text-[11px] px-3 py-1 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddViolation}
                        disabled={!selectedRegId}
                        className="text-[11px] px-3 py-1 rounded-lg bg-purple-700/60 text-purple-100 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        添加记录
                      </button>
                    </div>
                  </div>
                )}

                {auditSessionViolations.length === 0 ? (
                  <div className="p-6 rounded-xl border-2 border-dashed border-gray-700/50 bg-gray-800/20 text-center">
                    <ShieldCheck className="w-8 h-8 text-green-600/50 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">暂未发现违规记录</p>
                    <p className="text-[10px] text-gray-600 mt-1">继续保持合规经营！</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditSessionViolations.map((vio, idx) => {
                      const reg = getRegulation(vio.regulationId)
                      const sev = reg ? getSeverityLabel(reg.severity) : null
                      return (
                        <div
                          key={vio.id}
                          className="p-3 rounded-xl border border-gray-700/40 bg-gray-800/40 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-700/60 text-[10px] text-gray-400 flex items-center justify-center mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    vio.violationType === 'misdiagnosis' ? 'bg-red-900/50 text-red-300' :
                                    vio.violationType === 'expired_medicine' ? 'bg-purple-900/50 text-purple-300' :
                                    vio.violationType === 'broken_equipment' ? 'bg-orange-900/50 text-orange-300' :
                                    'bg-gray-700 text-gray-300'
                                  }`}>
                                    {getViolationTypeLabel(vio.violationType)}
                                  </span>
                                  {reg && sev && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${sev.bg} ${sev.color} border`}>
                                      {sev.label}
                                    </span>
                                  )}
                                  {reg && (
                                    <span className="text-[10px] text-gray-500">
                                      [{reg.code}] {reg.name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                  {vio.description}
                                </p>
                                {vio.petName && (
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    涉事宠物：{vio.petName}
                                    {vio.caseId && ` · 病例 #${vio.caseId.slice(-6)}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => removeAuditSessionViolation(vio.id)}
                              className="flex-shrink-0 p-1 rounded hover:bg-red-900/40 text-gray-500 hover:text-red-400 transition-colors"
                              title="移除"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {reg && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-gray-700/40 text-[10px]">
                              <span className="text-gray-500 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-orange-400" />
                                风险 +{vio.riskPoints}
                              </span>
                              <span className="text-yellow-400 font-medium">
                                基准罚款 {reg.baseFine} ⬡
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300">
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  情况陈述与整改承诺
                  <span className="text-[10px] text-purple-400 font-normal">
                    （超过30字可减免10%罚款）
                  </span>
                </label>
                <textarea
                  value={auditSubmissionNotes}
                  onChange={e => setAuditSubmissionNotes(e.target.value)}
                  placeholder="请如实陈述违规情况，并说明后续整改措施和承诺..."
                  rows={4}
                  className="w-full text-sm p-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-gray-200 placeholder-gray-600 focus:border-cyan-600/60 focus:outline-none resize-none transition-colors"
                />
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>{auditSubmissionNotes.length} / 500 字</span>
                  {auditSubmissionNotes.length >= 30 && (
                    <span className="text-green-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      已满足减免条件
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {!isPending && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border-2 ${statusInfo.bg} text-center`}>
                <div className={`mb-2 inline-flex p-3 rounded-2xl ${statusInfo.bg} border ${statusInfo.color}`}>
                  {statusInfo.icon}
                </div>
                <h3 className={`font-display text-xl tracking-wider mb-1 ${statusInfo.color}`}>
                  {currentAudit.status === 'approved' && '审查通过，准予放行'}
                  {currentAudit.status === 'fined' && '违规处罚决定'}
                  {currentAudit.status === 'rectification' && '责令整改通知'}
                </h3>
                {currentAudit.releaseNotes && (
                  <p className="text-sm text-gray-300 max-w-md mx-auto">
                    {currentAudit.releaseNotes}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl ${currentAudit.totalFine > 0 ? 'bg-yellow-900/20 border border-yellow-700/40' : 'bg-green-900/20 border border-green-700/40'}`}>
                  <div className="text-[10px] text-gray-400 mb-1">罚款金额</div>
                  <div className={`text-2xl font-display ${currentAudit.totalFine > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {currentAudit.totalFine > 0 ? `-${currentAudit.totalFine} ⬡` : '0 ⬡'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    余额：{player.coins} ⬡
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/40">
                  <div className="text-[10px] text-gray-400 mb-1">违规项数</div>
                  <div className={`text-2xl font-display ${currentAudit.violationsFound.length > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    {currentAudit.violationsFound.length} 项
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    风险等级下降 10
                  </div>
                </div>
              </div>

              {currentAudit.violationsFound.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowResultDetails(!showResultDetails)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-gray-700/40 hover:bg-gray-800/70 transition-colors"
                  >
                    <span className="text-xs text-gray-300 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
                      违规明细 ({currentAudit.violationsFound.length}项)
                    </span>
                    {showResultDetails ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {showResultDetails && (
                    <div className="space-y-2">
                      {currentAudit.violationsFound.map((vio, idx) => {
                        const reg = getRegulation(vio.regulationId)
                        const sev = reg ? getSeverityLabel(reg.severity) : null
                        const fine = reg ? Math.floor(reg.baseFine * (reg.severity === 'severe' ? 1.5 : reg.severity === 'moderate' ? 1 : 0.7)) : 0
                        return (
                          <div
                            key={vio.id}
                            className="p-3 rounded-xl bg-gray-800/30 border border-gray-700/30"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-gray-500">#{idx + 1}</span>
                                {reg && sev && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${sev.bg} ${sev.color} border`}>
                                    {sev.label}
                                  </span>
                                )}
                                {reg && (
                                  <span className="text-[10px] text-gray-400">
                                    [{reg.code}] {reg.name}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-yellow-400 font-medium whitespace-nowrap">
                                -{fine} ⬡
                              </span>
                            </div>
                            <p className="text-xs text-gray-300">{vio.description}</p>
                            {reg && (
                              <p className="text-[10px] text-cyan-400 mt-1.5 pt-1.5 border-t border-gray-700/30">
                                整改要求：{reg.rectificationRequirement}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {currentAudit.status === 'rectification' && currentAudit.rectificationDeadline && (
                <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    整改期限
                  </div>
                  <p className="text-[11px] text-gray-300">
                    请于 <span className="text-red-400 font-medium">{formatDate(currentAudit.rectificationDeadline)}</span> 前完成所有整改项，逾期将追加处罚。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-800/60 bg-gray-900/80">
          {isPending ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                <span>星际兽医管理局</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-900/40"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    审查中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    提交审查
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] text-gray-500">
                {currentAudit.status === 'approved' && '继续保持合规经营，祝您生意兴隆！'}
                {currentAudit.status === 'fined' && '请吸取教训，加强日常管理。'}
                {currentAudit.status === 'rectification' && '请按时完成整改，接受复查。'}
              </div>
              <button
                onClick={dismissAudit}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-cyan-700/60 text-cyan-100 text-sm font-medium hover:bg-cyan-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                确认并继续
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
