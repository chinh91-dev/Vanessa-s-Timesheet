import * as read from "./incident-service.read";
import * as write from "./incident-service.write";

export const IncidentService = { ...read, ...write };
