import type { BusyBlock } from '../../domain/entities/Planning'
import type { CalendarAdapter } from '../../domain/interfaces/PlannerPorts'

abstract class CalendarAdapterContract implements CalendarAdapter { abstract readonly provider: CalendarAdapter['provider']; async listEvents(): Promise<BusyBlock[]> { throw new Error(`El adaptador ${this.provider} requiere autorización OAuth antes de consultar eventos.`) } }
export class GoogleCalendarAdapter extends CalendarAdapterContract { readonly provider = 'google' as const }
export class OutlookCalendarAdapter extends CalendarAdapterContract { readonly provider = 'outlook' as const }
export class AppleCalendarAdapter extends CalendarAdapterContract { readonly provider = 'apple' as const }
