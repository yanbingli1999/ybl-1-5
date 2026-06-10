import { create } from 'zustand'
import {
  type PetCase,
  type Player,
  type Equipment,
  type GamePhase,
  type DiagnosisResult,
  type ActionType,
  type AccidentType,
  type Regulation,
  type ViolationRecord,
  type ViolationType,
  type AuditRecord,
  type RegulatoryRisk,
  initialEquipment,
  generatePetCase,
  generateInitialCases,
  generateTestCases,
  getDisease,
  getMedicine,
  getRegulation,
  getRegulationsByViolation,
  generateViolationRecord,
  generateAuditNumber,
  getRandomInspector,
  regulations,
} from '@/data/gameData'

interface GameState {
  cases: PetCase[]
  activeCaseId: string | null
  player: Player
  equipment: Equipment[]
  gamePhase: GamePhase
  accidentType: AccidentType | null
  diagnosisResult: DiagnosisResult | null
  actionCooldowns: Record<ActionType, number>
  selectedMedicineId: string | null
  showMedicineSelector: boolean
  pendingAction: 'medicate' | 'inject' | 'feed' | null

  regulatoryRisk: RegulatoryRisk
  violationRecords: ViolationRecord[]
  auditRecords: AuditRecord[]
  currentAudit: AuditRecord | null
  showAuditPanel: boolean
  auditSessionViolations: ViolationRecord[]
  auditSubmissionNotes: string

  selectCase: (id: string) => void
  examine: () => void
  medicate: () => void
  inject: () => void
  feed: () => void
  isolate: () => void
  selectMedicine: (id: string) => void
  cancelMedicineSelect: () => void
  performTreatment: (action: ActionType, medicineId?: string | null) => void
  repairEquipment: (id: string) => void
  dismissResult: () => void
  dismissAccident: () => void
  generateNewCase: () => void
  loadTestCases: () => void
  resetGame: () => void

  addRisk: (amount: number, reason: string) => void
  reduceRisk: (amount: number, reason: string) => void
  addViolation: (type: ViolationType, caseId: string | null, petName: string | null, description: string, riskPoints: number) => void
  triggerRandomAudit: () => void
  addAuditSessionViolation: (regulationId: string, description: string, riskPoints: number) => void
  removeAuditSessionViolation: (vioId: string) => void
  setAuditSubmissionNotes: (notes: string) => void
  submitAudit: () => void
  dismissAudit: () => void
  clearCurrentRectification: (index: number) => void
}

const initialPlayer: Player = {
  coins: 200,
  level: 1,
  exp: 0,
  cured: 0,
  misdiagnosed: 0,
  totalIncome: 0,
}

const initialRegulatoryRisk: RegulatoryRisk = {
  currentRiskLevel: 0,
  maxRiskLevel: 100,
  riskHistory: [],
  auditsCompleted: 0,
  totalFinesPaid: 0,
  currentRectifications: [],
}

const expPerLevel = 100

function getCoinsForUrgency(urgency: PetCase['urgency']): number {
  switch (urgency) {
    case 'low': return 30
    case 'medium': return 50
    case 'high': return 80
  }
}

function getPenaltyForAccident(urgency: PetCase['urgency']): number {
  switch (urgency) {
    case 'low': return 20
    case 'medium': return 35
    case 'high': return 60
  }
}

function getActionLabel(action: ActionType): string {
  switch (action) {
    case 'examine': return '检查'
    case 'medicate': return '用药'
    case 'inject': return '打针'
    case 'feed': return '喂食'
    case 'isolate': return '隔离'
  }
}

function shouldTriggerAudit(riskLevel: number, casesHandled: number, lastAuditCases: number): boolean {
  const riskChance = riskLevel / 200
  const timeChance = (casesHandled - lastAuditCases) / 20
  return Math.random() < (riskChance + timeChance) && (casesHandled - lastAuditCases) >= 3
}

let lastAuditCaseCount = 0
let totalCasesHandled = 0

export const useGameStore = create<GameState>((set, get) => ({
  cases: generateInitialCases(5),
  activeCaseId: null,
  player: { ...initialPlayer },
  equipment: initialEquipment.map(e => ({ ...e })),
  gamePhase: 'idle',
  accidentType: null,
  diagnosisResult: null,
  actionCooldowns: {
    examine: 0,
    medicate: 0,
    inject: 0,
    feed: 0,
    isolate: 0,
  },
  selectedMedicineId: null,
  showMedicineSelector: false,
  pendingAction: null,

  regulatoryRisk: { ...initialRegulatoryRisk },
  violationRecords: [],
  auditRecords: [],
  currentAudit: null,
  showAuditPanel: false,
  auditSessionViolations: [],
  auditSubmissionNotes: '',

  selectCase: (id: string) => {
    const state = get()
    if (state.gamePhase === 'accident' || state.gamePhase === 'result') return
    set({
      activeCaseId: id,
      gamePhase: 'diagnosing',
      showMedicineSelector: false,
      selectedMedicineId: null,
      pendingAction: null,
    })
  },

  examine: () => {
    const state = get()
    const activeCase = state.cases.find(c => c.id === state.activeCaseId)
    if (!activeCase) return

    const scanner = state.equipment.find(e => e.requiredAction === 'examine')
    if (scanner?.status !== 'normal') return
    if (state.actionCooldowns.examine > Date.now()) return

    const updatedCases = state.cases.map(c =>
      c.id === activeCase.id ? { ...c, examined: true } : c
    )

    set({
      cases: updatedCases,
      actionCooldowns: { ...state.actionCooldowns, examine: Date.now() + 3000 },
    })
  },

  medicate: () => {
    set({ showMedicineSelector: true, pendingAction: 'medicate' })
  },

  inject: () => {
    set({ showMedicineSelector: true, pendingAction: 'inject' })
  },

  feed: () => {
    set({ showMedicineSelector: true, pendingAction: 'feed' })
  },

  isolate: () => {
    get().performTreatment('isolate')
  },

  selectMedicine: (id: string) => {
    const state = get()
    const action = state.pendingAction
    if (!action) return

    const medicine = getMedicine(id)
    if (medicine && state.player.coins < medicine.cost) {
      const activeCase = state.cases.find(c => c.id === state.activeCaseId)
      if (!activeCase) return

      const disease = getDisease(activeCase.diseaseId)
      const itemType = action === 'feed' ? '食物' : '药品'
      const result: DiagnosisResult = {
        success: false,
        diseaseName: disease?.name || '',
        actionTaken: action,
        correctAction: disease?.correctAction || 'medicate',
        medicineUsed: id,
        correctMedicine: disease?.medicineId || null,
        coinsEarned: 0,
        medicineCost: medicine.cost,
        accidentType: null,
        damagedEquipment: null,
        message: `星币不足！${medicine.name} 需要 ${medicine.cost} ⬡，你只有 ${state.player.coins} ⬡`,
        errorType: 'funds',
        isExpiredMedicine: false,
      }

      set({
        gamePhase: 'result',
        diagnosisResult: result,
        showMedicineSelector: false,
        selectedMedicineId: null,
        pendingAction: null,
      })
      return
    }

    get().performTreatment(action, id)
  },

  cancelMedicineSelect: () => {
    set({ showMedicineSelector: false, selectedMedicineId: null, pendingAction: null })
  },

  performTreatment: (action: ActionType, medicineId?: string | null) => {
    const state = get()
    const activeCase = state.cases.find(c => c.id === state.activeCaseId)
    if (!activeCase) return

    const disease = getDisease(activeCase.diseaseId)
    if (!disease) return

    const requiredEquip = state.equipment.find(e => e.requiredAction === action)
    if (requiredEquip?.status !== 'normal') return

    const actionCorrect = action === disease.correctAction
    const needsMedicine = disease.medicineId !== null
    const medicine = medicineId ? getMedicine(medicineId) : null
    const medicineCorrect = !needsMedicine || (medicineId !== undefined && medicineId === disease.medicineId)
    const medicineCost = medicine?.cost || 0

    const isExpiredMedicine = medicine ? Math.random() < medicine.expiryChance : false

    let errorType: 'action' | 'medicine' | null = null
    if (!actionCorrect) errorType = 'action'
    else if (actionCorrect && !medicineCorrect) errorType = 'medicine'

    const isCorrect = actionCorrect && medicineCorrect && !isExpiredMedicine

    if (isExpiredMedicine && medicine) {
      get().addViolation(
        'expired_medicine',
        activeCase.id,
        activeCase.petName,
        `对宠物「${activeCase.petName}」使用了过期${action === 'feed' ? '食物' : '药品'}「${medicine.name}」，违反星际药品管理条例`,
        medicine.riskPoints
      )
    }

    if (isCorrect) {
      const coinsEarned = getCoinsForUrgency(activeCase.urgency)
      const expGain = activeCase.urgency === 'high' ? 30 : activeCase.urgency === 'medium' ? 20 : 10
      const netCoins = coinsEarned - medicineCost
      const newExp = state.player.exp + expGain
      const levelUp = newExp >= expPerLevel
      const newLevel = levelUp ? state.player.level + 1 : state.player.level
      const newExpAfterLevel = levelUp ? newExp - expPerLevel : newExp

      const updatedCases = state.cases.map(c =>
        c.id === activeCase.id ? { ...c, status: 'cured' as const } : c
      )

      const itemType = action === 'feed' ? '食物' : action === 'inject' ? '注射剂' : '药品'
      let message = `诊断正确！${activeCase.petName} 的「${disease.name}」已治愈！`
      if (medicineCost > 0) {
        message += `（扣除${itemType}费 ${medicineCost} ⬡）`
      }

      const result: DiagnosisResult = {
        success: true,
        diseaseName: disease.name,
        actionTaken: action,
        correctAction: disease.correctAction,
        medicineUsed: medicineId || null,
        correctMedicine: disease.medicineId,
        coinsEarned: netCoins,
        medicineCost,
        accidentType: null,
        damagedEquipment: null,
        message,
        errorType: null,
        isExpiredMedicine: false,
      }

      set({
        cases: updatedCases,
        player: {
          ...state.player,
          coins: state.player.coins + netCoins,
          level: newLevel,
          exp: newExpAfterLevel,
          cured: state.player.cured + 1,
          totalIncome: state.player.totalIncome + coinsEarned,
        },
        gamePhase: 'result',
        diagnosisResult: result,
        showMedicineSelector: false,
        selectedMedicineId: null,
        pendingAction: null,
      })
    } else {
      const penalty = getPenaltyForAccident(activeCase.urgency)
      const totalDeduction = penalty + medicineCost
      const damagedEquipId = (!isExpiredMedicine && disease.accidentType === 'bite')
        ? requiredEquip?.id || null
        : null

      const updatedCases = state.cases.map(c =>
        c.id === activeCase.id ? { ...c, status: 'accident' as const } : c
      )

      const updatedEquipment = damagedEquipId
        ? state.equipment.map(e =>
            e.id === damagedEquipId ? { ...e, status: 'damaged' as const } : e
          )
        : state.equipment

      let message = ''
      const itemType = action === 'feed' ? '食物' : action === 'inject' ? '注射剂' : '药品'
      
      if (isExpiredMedicine && medicine) {
        message = `⚠️ ${itemType}过期！「${medicine.name}」已变质，${activeCase.petName} 的「${disease.name}」治疗失败！（扣除${itemType}费 ${medicineCost} ⬡）`
      } else if (errorType === 'action') {
        message = `误诊！${activeCase.petName} 患的是「${disease.name}」，应该${getActionLabel(disease.correctAction)}而不是${getActionLabel(action)}！`
        if (medicineCost > 0) {
          message += `（扣除${itemType}费 ${medicineCost} ⬡）`
        }
        get().addViolation(
          'misdiagnosis',
          activeCase.id,
          activeCase.petName,
          `对宠物「${activeCase.petName}」采取了错误的${getActionLabel(action)}操作，正确操作应为${getActionLabel(disease.correctAction)}`,
          activeCase.urgency === 'high' ? 15 : activeCase.urgency === 'medium' ? 10 : 6
        )
      } else if (errorType === 'medicine') {
        const correctMed = disease.medicineId ? getMedicine(disease.medicineId) : null
        const usedMed = medicineId ? getMedicine(medicineId) : null
        message = `用错${itemType}了！${activeCase.petName} 患的是「${disease.name}」，应该用「${correctMed?.name || '正确物品'}」而不是「${usedMed?.name || '未知物品'}」！（扣除${itemType}费 ${medicineCost} ⬡）`
        get().addViolation(
          'expired_medicine',
          activeCase.id,
          activeCase.petName,
          `对宠物「${activeCase.petName}」使用了错误${itemType}「${usedMed?.name || '未知'}」，正确药品应为「${correctMed?.name || '指定药品'}」`,
          activeCase.urgency === 'high' ? 12 : activeCase.urgency === 'medium' ? 8 : 5
        )
      }

      if (damagedEquipId) {
        const equipName = state.equipment.find(e => e.id === damagedEquipId)?.name || '未知设备'
        get().addViolation(
          'broken_equipment',
          activeCase.id,
          activeCase.petName,
          `宠物「${activeCase.petName}」咬坏了设备「${equipName}」，未及时维护诊疗设备存在安全隐患`,
          10
        )
      }

      const result: DiagnosisResult = {
        success: false,
        diseaseName: disease.name,
        actionTaken: action,
        correctAction: disease.correctAction,
        medicineUsed: medicineId || null,
        correctMedicine: disease.medicineId,
        coinsEarned: -totalDeduction,
        medicineCost,
        accidentType: isExpiredMedicine ? null : disease.accidentType,
        damagedEquipment: damagedEquipId,
        message,
        errorType: isExpiredMedicine ? 'medicine' : errorType,
        isExpiredMedicine,
      }

      set({
        cases: updatedCases,
        equipment: updatedEquipment,
        player: {
          ...state.player,
          coins: Math.max(0, state.player.coins - totalDeduction),
          misdiagnosed: state.player.misdiagnosed + 1,
        },
        gamePhase: isExpiredMedicine ? 'result' : 'accident',
        accidentType: isExpiredMedicine ? null : disease.accidentType,
        diagnosisResult: result,
        showMedicineSelector: false,
        selectedMedicineId: null,
        pendingAction: null,
      })
    }
  },

  repairEquipment: (id: string) => {
    const state = get()
    const equip = state.equipment.find(e => e.id === id)
    if (!equip || equip.status === 'normal') return
    if (state.player.coins < equip.repairCost) return

    set({
      equipment: state.equipment.map(e =>
        e.id === id ? { ...e, status: 'normal' as const } : e
      ),
      player: {
        ...state.player,
        coins: state.player.coins - equip.repairCost,
      },
    })
  },

  dismissResult: () => {
    const state = get()
    const remainingCases = state.cases.filter(c => c.status !== 'cured' && c.status !== 'accident')
    while (remainingCases.length < 4) {
      remainingCases.push(generatePetCase())
    }

    totalCasesHandled++
    get().reduceRisk(2, '成功完成诊疗')

    set({
      activeCaseId: null,
      gamePhase: 'idle',
      diagnosisResult: null,
      cases: remainingCases,
    })

    if (shouldTriggerAudit(get().regulatoryRisk.currentRiskLevel, totalCasesHandled, lastAuditCaseCount)) {
      setTimeout(() => get().triggerRandomAudit(), 800)
    }
  },

  dismissAccident: () => {
    const state = get()
    const remainingCases = state.cases.filter(c => c.status !== 'cured' && c.status !== 'accident')
    while (remainingCases.length < 4) {
      remainingCases.push(generatePetCase())
    }

    totalCasesHandled++

    set({
      activeCaseId: null,
      gamePhase: 'idle',
      accidentType: null,
      diagnosisResult: null,
      cases: remainingCases,
    })

    if (shouldTriggerAudit(get().regulatoryRisk.currentRiskLevel, totalCasesHandled, lastAuditCaseCount)) {
      setTimeout(() => get().triggerRandomAudit(), 800)
    }
  },

  generateNewCase: () => {
    const state = get()
    const newCase = generatePetCase()
    set({ cases: [...state.cases, newCase] })
  },

  loadTestCases: () => {
    set({
      cases: generateTestCases(),
      activeCaseId: null,
      gamePhase: 'idle',
      accidentType: null,
      diagnosisResult: null,
      showMedicineSelector: false,
      selectedMedicineId: null,
      pendingAction: null,
    })
  },

  resetGame: () => {
    totalCasesHandled = 0
    lastAuditCaseCount = 0
    set({
      cases: generateInitialCases(5),
      activeCaseId: null,
      player: { ...initialPlayer },
      equipment: initialEquipment.map(e => ({ ...e })),
      gamePhase: 'idle',
      accidentType: null,
      diagnosisResult: null,
      actionCooldowns: {
        examine: 0,
        medicate: 0,
        inject: 0,
        feed: 0,
        isolate: 0,
      },
      showMedicineSelector: false,
      selectedMedicineId: null,
      pendingAction: null,
      regulatoryRisk: { ...initialRegulatoryRisk },
      violationRecords: [],
      auditRecords: [],
      currentAudit: null,
      showAuditPanel: false,
      auditSessionViolations: [],
      auditSubmissionNotes: '',
    })
  },

  addRisk: (amount: number, reason: string) => {
    const state = get()
    const newLevel = Math.min(state.regulatoryRisk.maxRiskLevel, state.regulatoryRisk.currentRiskLevel + amount)
    set({
      regulatoryRisk: {
        ...state.regulatoryRisk,
        currentRiskLevel: newLevel,
        riskHistory: [
          ...state.regulatoryRisk.riskHistory.slice(-49),
          { timestamp: Date.now(), change: amount, reason },
        ],
      },
    })
  },

  reduceRisk: (amount: number, reason: string) => {
    const state = get()
    const newLevel = Math.max(0, state.regulatoryRisk.currentRiskLevel - amount)
    set({
      regulatoryRisk: {
        ...state.regulatoryRisk,
        currentRiskLevel: newLevel,
        riskHistory: [
          ...state.regulatoryRisk.riskHistory.slice(-49),
          { timestamp: Date.now(), change: -amount, reason },
        ],
      },
    })
  },

  addViolation: (type: ViolationType, caseId: string | null, petName: string | null, description: string, riskPoints: number) => {
    const state = get()
    const regs = getRegulationsByViolation(type)
    const regulation = regs[Math.floor(Math.random() * regs.length)] || regulations[0]
    const record = generateViolationRecord(caseId, regulation.id, type, petName, description, riskPoints)
    set({
      violationRecords: [...state.violationRecords, record],
    })
    get().addRisk(riskPoints, `违规：${description.slice(0, 20)}...`)
  },

  triggerRandomAudit: () => {
    const state = get()
    if (state.showAuditPanel) return

    lastAuditCaseCount = totalCasesHandled
    const newAudit: AuditRecord = {
      id: `audit_${Date.now()}`,
      auditNumber: generateAuditNumber(),
      timestamp: Date.now(),
      inspectorName: getRandomInspector(),
      status: 'pending',
      totalFine: 0,
      violationsFound: [],
      rectificationDeadline: null,
      releaseNotes: null,
    }

    const sessionVios: ViolationRecord[] = []
    const riskRatio = state.regulatoryRisk.currentRiskLevel / state.regulatoryRisk.maxRiskLevel
    const violationCount = Math.min(
      state.violationRecords.filter(v => !v.resolved).length,
      Math.max(0, Math.floor(Math.random() * 4) + (riskRatio > 0.5 ? 1 : 0))
    )

    const unresolved = [...state.violationRecords.filter(v => !v.resolved)].reverse()
    for (let i = 0; i < violationCount && i < unresolved.length; i++) {
      sessionVios.push({ ...unresolved[i] })
    }

    set({
      currentAudit: newAudit,
      showAuditPanel: true,
      auditSessionViolations: sessionVios,
      auditSubmissionNotes: '',
    })
  },

  addAuditSessionViolation: (regulationId: string, description: string, riskPoints: number) => {
    const state = get()
    const reg = getRegulation(regulationId)
    if (!reg) return
    const record = generateViolationRecord(null, regulationId, reg.violationType, null, description, riskPoints)
    set({
      auditSessionViolations: [...state.auditSessionViolations, record],
      violationRecords: [...state.violationRecords, record],
    })
    get().addRisk(riskPoints, `审查中发现：${description.slice(0, 20)}`)
  },

  removeAuditSessionViolation: (vioId: string) => {
    const state = get()
    set({
      auditSessionViolations: state.auditSessionViolations.filter(v => v.id !== vioId),
    })
  },

  setAuditSubmissionNotes: (notes: string) => {
    set({ auditSubmissionNotes: notes })
  },

  submitAudit: () => {
    const state = get()
    if (!state.currentAudit) return

    let totalFine = 0
    const rectifications: string[] = []

    state.auditSessionViolations.forEach(vio => {
      const reg = getRegulation(vio.regulationId)
      if (reg) {
        const severityMultiplier = reg.severity === 'severe' ? 1.5 : reg.severity === 'moderate' ? 1 : 0.7
        const fine = Math.floor(reg.baseFine * severityMultiplier)
        totalFine += fine
        if (!rectifications.includes(reg.rectificationRequirement)) {
          rectifications.push(reg.rectificationRequirement)
        }
      }
    })

    const honestyBonus = state.auditSubmissionNotes.length > 30 ? 0.9 : 1
    totalFine = Math.floor(totalFine * honestyBonus)

    const newStatus = totalFine > 200 ? 'rectification' : totalFine > 0 ? 'fined' : 'approved'
    const releaseNotes = newStatus === 'approved'
      ? `本次抽查结果：合规性良好，${state.auditSubmissionNotes.length > 30 ? '整改态度诚恳，' : ''}予以放行。`
      : newStatus === 'fined'
        ? `本次抽查发现 ${state.auditSessionViolations.length} 项违规，已处罚并要求加强管理。`
        : `本次抽查违规情况较严重（${state.auditSessionViolations.length}项），需立即整改并接受复查。`

    const completedAudit: AuditRecord = {
      ...state.currentAudit,
      status: newStatus,
      totalFine,
      violationsFound: state.auditSessionViolations,
      rectificationDeadline: newStatus === 'rectification' ? Date.now() + 7 * 24 * 60 * 60 * 1000 : null,
      releaseNotes,
    }

    const updatedViolations = state.violationRecords.map(v => {
      const inSession = state.auditSessionViolations.find(sv => sv.id === v.id)
      return inSession ? { ...v, resolved: true } : v
    })

    const newRectifications = [...state.regulatoryRisk.currentRectifications]
    rectifications.forEach(r => {
      if (!newRectifications.includes(r)) newRectifications.push(r)
    })

    set({
      currentAudit: completedAudit,
      auditRecords: [...state.auditRecords, completedAudit],
      player: {
        ...state.player,
        coins: Math.max(0, state.player.coins - totalFine),
      },
      violationRecords: updatedViolations,
      regulatoryRisk: {
        ...state.regulatoryRisk,
        auditsCompleted: state.regulatoryRisk.auditsCompleted + 1,
        totalFinesPaid: state.regulatoryRisk.totalFinesPaid + totalFine,
        currentRectifications: newRectifications,
        currentRiskLevel: Math.max(0, state.regulatoryRisk.currentRiskLevel - 10),
      },
    })
  },

  dismissAudit: () => {
    set({
      showAuditPanel: false,
      auditSessionViolations: [],
      auditSubmissionNotes: '',
    })
    setTimeout(() => {
      const state = get()
      if (state.regulatoryRisk.currentRiskLevel > 60) {
        get().reduceRisk(15, '审查后采取整改措施')
      } else if (state.regulatoryRisk.currentRiskLevel > 30) {
        get().reduceRisk(10, '审查结束，继续合规经营')
      } else {
        get().reduceRisk(5, '审查通过')
      }
    }, 500)
  },

  clearCurrentRectification: (index: number) => {
    const state = get()
    const newRects = state.regulatoryRisk.currentRectifications.filter((_, i) => i !== index)
    set({
      regulatoryRisk: {
        ...state.regulatoryRisk,
        currentRectifications: newRects,
      },
    })
    get().reduceRisk(8, '完成整改项')
  },
}))
