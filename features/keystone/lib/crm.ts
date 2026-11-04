/** Contact-window rule: outbound contact dated before the athlete\'s window opens is a possible compliance breach. It is recorded, never hidden, and only with explicit acknowledgment. */
export function contactWindowBreach(kind:string,occurredAt:Date,allowedFrom:Date|null|undefined){
  return kind!=='note'&&!!allowedFrom&&occurredAt.getTime()<allowedFrom.getTime();
}
