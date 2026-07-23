import type { UserPlanningProfile } from '../planner'
export function EnergyProfileEditor({profile,onChange}:{profile:UserPlanningProfile;onChange:(profile:UserPlanningProfile)=>void}){
  const periods=Object.keys(profile.energyProfile) as Array<keyof UserPlanningProfile['energyProfile']>
  return <fieldset className="energy-profile"><legend>Perfil de energía</legend>{periods.map(period=><label key={period}><span>{period==='morning'?'Mañana':period==='afternoon'?'Tarde':'Noche'}</span><select value={profile.energyProfile[period]} onChange={event=>onChange({...profile,energyProfile:{...profile.energyProfile,[period]:event.target.value}})}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></label>)}</fieldset>
}
