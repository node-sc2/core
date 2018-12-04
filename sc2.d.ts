export function createAgent(blueprint?: AgentObject): Agent;
export function createEngine(opts?: EngineOptions): Engine;
export function createSystem(sys: EventReader<SystemObject>, opts?: SystemOptions): EventReader<System>;
export function createPlayer(settings, agent: Agent);
export type taskFunctions = { [index: string]: BuildHelper }