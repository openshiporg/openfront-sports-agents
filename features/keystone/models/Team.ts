import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const Team = domainList({
    name: text({validation:{isRequired:true}}),
    league: text(),
    city: text(),
    athlete_team: rel("Athlete.team", true),
    playingContract_team: rel("PlayingContract.team", true),
}, "canManageAthletes", undefined, false);
