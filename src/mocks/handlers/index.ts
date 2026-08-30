import { authHandlers } from "./auth";
import { taskHandlers } from "./tasks";
import { userHandlers } from "./user";

export const handlers = [...authHandlers, ...taskHandlers, ...userHandlers];
