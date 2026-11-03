import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const AuditEvent = domainList({
    actor: rel("User.auditEvent_actor", false),
    action: text({validation:{isRequired:true}}),
    targetList: text({validation:{isRequired:true}}),
    targetId: text({validation:{isRequired:true}}),
    before: json(),
    after: json(),
    reason: text(),
    requestId: text({isIndexed:true}),
}, "canReadAudit", undefined, true);
