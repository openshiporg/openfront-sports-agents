import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const Task = domainList({
    title: text({validation:{isRequired:true}}),
    athlete: rel("Athlete.task_athlete", false),
    deal: rel("EndorsementDeal.task_deal", false),
    contract: rel("PlayingContract.task_contract", false),
    assignee: rel("User.task_assignee", false),
    dueAt: timestamp(),
    status: state(['open', 'in_progress', 'completed', 'cancelled']),
    priority: state(['normal', 'high', 'urgent']),
    autoKey: text({isIndexed:"unique",db:{isNullable:true}}),
}, "canManageAthletes", 'athlete', false);
