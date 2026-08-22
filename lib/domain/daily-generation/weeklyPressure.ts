export const WEEKLY_PRESSURE = [
  {day:"SUNDAY",tier:"CHALLENGING",note:"New week. The pressure starts here."},
  {day:"MONDAY",tier:"CHALLENGING+",note:"A little less room for error."},
  {day:"TUESDAY",tier:"HARD",note:"The weekly climb is underway."},
  {day:"WEDNESDAY",tier:"HARD+",note:"Midweek. Faster, tighter, harder."},
  {day:"THURSDAY",tier:"VERY HARD",note:"Only sharp runs survive."},
  {day:"FRIDAY",tier:"BRUTAL",note:"Tiny margins. One attempt."},
  {day:"SATURDAY",tier:"ELITE",note:"The hardest Cut of the week."},
] as const;

export function localWeeklyPressure(now=new Date()){return WEEKLY_PRESSURE[now.getDay()]!;}
export function pressureIndexForDate(date:string){const d=new Date(`${date}T12:00:00Z`);return d.getUTCDay();}
