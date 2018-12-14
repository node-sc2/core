/// <reference types="node" />
/// <reference types="@node-sc2/proto" />

interface Point2D extends SC2APIProtocol.Point2D { }
interface Point3D extends SC2APIProtocol.Point { }

type Shape = {
    pos: Point2D,
    height: number,
    width: number,
}

type Grid2D = Array<Uint8Array>;
type UnitTypeId = number;
type AbilityId = number;

type GenericState = any;

type SystemType = 'engine' | 'agent' | 'build';

type SystemOptions = {
    state?: any;
    stepIncrement?: number;
}

interface SystemObject {
    name?: string;
    type?: SystemType;
    setup?: (world: World) => void;
    defaultOptions?: SystemOptions;
    buildOrder?: Array<BuildTask>;
    buildComplete?: (world: World, gameLoop: number) => Promise<any>;
}

declare enum BuildOrderStatus {
    NOT_STARTED = 0,
    IN_PROGRESS = 1,
    COMPLETE = 2,
}

declare enum BuildResult {
    SUCCESS = 0,
    CANNOT_SATISFY = 1,
    ERROR = 2,
}

type BuildTaskI = {
    type: 'build' | 'train' | 'upgrade' | 'ability' | 'worker',
    id?: number;
    name?: string;
    qty?: number;
    opts?: object;
    index?: number;
    touched?: boolean;
    supply?: number;
    status?: BuildOrderStatus;
}

type BuildTask = BuildTaskI | [number, BuildTaskI];

type BuildHelper = (...args) => BuildTaskI;

type BuilderFunction = (world: World, task: BuildTaskI) => BuildTaskI;

type BuildFunction = (world: World, buildStep: BuildTaskI) => Promise<BuildOrderStatus>;

interface System extends SystemObject {
    readerId?: string;
    state: GenericState;
    setState(newState: object): void;
    setState(newState: (currentState) => object): void;
    setup(world: World): void;
}

interface BuilderSystem extends System {
    onStep?(world: Partial<World>, gameLoop?: number, result?: BuildResult): Promise<any>;
}

interface SystemWrapper<T> {
    (world: World): Promise<any>;
    setup(world: World): void;
}

type Enemy = {
    race: SC2APIProtocol.Race;
}

interface PlayerData extends SC2APIProtocol.PlayerCommon, SC2APIProtocol.PlayerRaw { }

interface Agent extends PlayerData {
    _world: World;
    readerId?: string;
    onGameStart: (world: World) => Promise<any>;
    onStep?: (resources: World) => void;
    interface: SC2APIProtocol.InterfaceOptions;
    canAfford: (unitTypeId: number, earmarkName?: string) => boolean;
    canAffordUpgrade: (upgradeId: number) => boolean;
    hasTechFor: (unitTypeId: number) => boolean;
    race?: SC2APIProtocol.Race;
    enemy?: Enemy;
    settings: SC2APIProtocol.PlayerSetup;
    systems: SystemWrapper<System>[];
    use: (sys: (SystemWrapper<System> | SystemWrapper<System>[])) => void;
    setup: (world: World) => void;
}

type UnitTypeGroup = Array<number>;

interface Unit extends SC2APIProtocol.Unit {
    noQueue?: boolean;
    lastSeen?: number;
    isWorker: () => boolean;
    isTownhall: () => boolean;
    isGasMine: () => boolean;
    isCurrent: () => boolean;
    hasReactor: () => boolean;
    hasTechLab: () => boolean;
    update: (unit: SC2APIProtocol.Unit) => void;
    labels: Map<string, any>;
}


interface UnitResource {
    _units: {
        [k: number]: Map<string, Unit>; // 1 = Self, 3 = Neutral, 4 = Enemy
    };
    clone: () => Map<string, Unit>;
    getBases(alliance?: SC2APIProtocol.Alliance): Unit[];
    getCombatUnits(): Unit[];
    getAll: (filter?: (number | UnitFilter)) => Unit[];
    getAlive: (filter?: (number | UnitFilter)) => Unit[];
    getById: (unitTypeId: number, filter?: UnitFilter) => Unit[];
    getByTag(unitTags: string): Unit;
    getByTag(unitTags: string[]): Unit[];
    getClosest: (pos: Point2D, units: Unit[], n?: number) => Unit[];
    getByType: (unitTypeIds: (number | UnitTypeGroup)) => Unit[];
    getProductionUnits: (unitTypeId: number) => Unit[];
    getUpgradeFacilities: (upgradeId: number) => Unit[];
    getMineralFields: (filter?: UnitFilter) => Unit[];
    getGasGeysers: (filter?: UnitFilter) => Unit[];
    getStructures: (filter?: UnitFilter) => Unit[];
    getWorkers: () => Unit[];
    getIdleWorkers: () => Unit[];
    getMineralWorkers: () => Unit[];
    getUnfinished: (filter?: UnitFilter) => Unit[];
    inProgress: (unitTypeId: number) => Unit[];
    withLabel: (label: string) => Unit[];
    withCurrentOrders: (abilityId: number) => Unit[];
}

interface UnitFilter extends Partial<Unit> {}

interface UnitSystem extends EngineObject {
    onStep: (world: World) => Promise<any>;
    onGameStart: (world: World) => Promise<any>;
}

type Path = number[][];

type Cluster = {
    centroid?: Point3D,
    mineralFields: Unit[],
    vespeneGeysers?: Unit[],
}

type ExpansionArea = {
    hull: Array<Point2D>;
    areaFill: Array<Point2D>;
    placementGrid: Array<Point2D>;
    mineralLine: Array<Point2D>;
    behindMineralLine: Array<Point2D>;
}

interface Expansion {
    base?: string; // entity tag ref of base Unit
    areas?: ExpansionArea;
    getBase(): Unit;
    getAlliance(): SC2APIProtocol.Alliance;
    cluster: Cluster;
    townhallPosition: Point2D;
    zPosition: number;
    centroid?: Point2D;
    labels: Map<string, any>;
    pathFromMain?: Path;
    pathFromEnemy?: Path;
}

type Grids = {
    miniMap?: Grid2D;
    placement?: Grid2D;
    pathing?: Grid2D;
}

type Locations = {
    self: Point3D;
    enemy: Point3D;
}

interface MapResource {
    _grids: Grids;
    _locations: Locations;
    _expansions: Expansion[];
    _expansionsFromEnemy: Expansion[];
    _graph: any;
    _mapState: SC2APIProtocol.MapState;
    _mapSize: SC2APIProtocol.Size2DI;
    getCreep: () => Point2D[];
    getGrids: () => Grids;
    getLocations: () => Locations;
    getExpansions: (alliance?: SC2APIProtocol.Alliance) => Expansion[];
    getMain: () => Expansion;
    getEnemyMain: () => Expansion;
    getNatural: () => Expansion;
    getEnemyNatural: () => Expansion;
    getThirds: () => Expansion[];
    getEnemyThirds: () => Expansion[];
    getClosestExpansion: (point: Point2D) => Expansion;
    getAvailableExpansions: () => Expansion[];
    getOccupiedExpansions: (alliance?: SC2APIProtocol.Alliance) => Expansion[];
    getCombatRally: () => Point2D;
    setGrids: (grids: Grids) => void;
    setGraph: (map: SC2APIProtocol.Size2DI) => void;
    setLocations: (locations: Locations) => void;
    path: (start: Point2D, end: Point2D) => number[][];
    setExpansions: (expansions: Expansion[]) => void;
}

interface MapSystem extends EngineObject, EventConsumer { }

type AbilityOptions = {
    target?: Unit | Point2D, 
    queue?: boolean,
}

interface ActionManager {
    _client?: NodeSC2Proto.ProtoClient;
    attack(units?: Unit[], unit?: Unit, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    attackMove(u?: Unit[], p?: Point2D, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    build(unitTypeid: number, target: Unit, worker?: Unit): Promise<SC2APIProtocol.ResponseAction>;
    build(unitTypeid: number, pos: Point2D, worker?: Unit): Promise<SC2APIProtocol.ResponseAction>;
    do(abilityId: number, tags: string, opts?: AbilityOptions ): Promise<SC2APIProtocol.ResponseAction>;
    do(abilityId: number, tags: string[], opts?: AbilityOptions): Promise<SC2APIProtocol.ResponseAction>;
    buildGasMine: () => Promise<SC2APIProtocol.ResponseAction>;
    gather: (unit: Unit, mineralField?: Unit, queue?: boolean) => Promise<SC2APIProtocol.ResponseAction>;
    mine: (units: Unit[], target: Unit, queue?: boolean) => Promise<SC2APIProtocol.ResponseAction>;
    move(units: Unit, target: Point2D, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    move(units: Unit[], target: Point2D, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    move(units: Unit, target: Unit, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    move(units: Unit[], target: Unit, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    train: (unitTypeId: number, tag?: Unit) => Promise<SC2APIProtocol.ResponseAction>;
    upgrade: (upgradeId: number, tag?: Unit) => Promise<SC2APIProtocol.ResponseAction>;
    smart(units: Unit[], target: Point2D, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    smart(units: Unit[], target: Unit, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    swapBuildings(unitA: Unit, unitB: Unit): Promise<null>;
    canPlace: (unitTypeId: number, positions: Point2D[]) => Promise<(Point2D | false)>;
    sendAction: (unitCommand: (SC2APIProtocol.ActionRawUnitCommand | SC2APIProtocol.ActionRawUnitCommand[])) => Promise<SC2APIProtocol.ResponseAction>;
    sendQuery: (query: SC2APIProtocol.RequestQuery) => Promise<SC2APIProtocol.ResponseQuery>;
}

type Color = {
    r: number;
    g: number;
    b: number;
}

interface Debugger {
    updateScreen: () => Promise<SC2APIProtocol.ResponseDebug>;
    removeCommand: (id: string) => void;
    setRegions: (expansions: Expansion[]) => void;
    setDrawCells: (id: string, points: SC2APIProtocol.Point[], zPos?: number) => void;
    setDrawSpheres: (id: string, points: SC2APIProtocol.Point[], zPos?: number) => void;
    setDrawTextWorld: (id: string, worldPoints: { pos: SC2APIProtocol.Point, text: string, color?: Color }[], zPos?: number) => void;
    setDrawTextScreen: (id: string, screenPoints: { pos: SC2APIProtocol.Point, text: string, color?: Color }[], zPos?: number) => void;
}

type GameFrame = {
    _previous?: GameFrame;
    _observation?: SC2APIProtocol.Observation;
    _gameInfo?: SC2APIProtocol.ResponseGameInfo;
    _gameLoop: number;
}

interface FrameResource {
    _previous?: GameFrame;
    _observation?: SC2APIProtocol.Observation;
    _gameInfo?: SC2APIProtocol.ResponseGameInfo;
    _gameLoop: number;
    getObservation: () => SC2APIProtocol.Observation;
    getGameInfo: () => SC2APIProtocol.ResponseGameInfo;
    getGameLoop: () => number;
    getPrevious: () => GameFrame;
    getMapState: () => SC2APIProtocol.MapState;
}

interface FrameSystem extends EngineObject {
    onStep: (world: World) => Promise<any>;
    onGameStart: (world: World) => Promise<any>;
}

type ReaderId = string;

type EventType = 'engine' | 'agent' | 'build' | 'all';

type SystemEvent = {
    type: EventType;
    name: string;
    data: any;
    gameLoop: number;
    readers: ReaderId[];
    consume(rederId: ReaderId): void;
    destroy(): void;
}

interface SystemEventData extends Partial<SystemEvent> {
    name: string;
}

interface EventChannel {
    createReader: (type?: EventType) => ReaderId;
    removeReader: (readerId: ReaderId) => void;
    read: (readerId: ReaderId) => SystemEvent[];
    write(event: SystemEventData, readerId?: ReaderId): void;
}

type UnitEvent = (world: World, data: Unit) => Promise<any>;
type EventConsumer = {
    onStep?: (world: World, gameLoop?: number) => Promise<any>;
    onGameStart?: (world: World) => Promise<any>;
    onUpgradeComplete?: (world: World, upgradeId: number) => Promise<any>;
    onUnitIdle?: UnitEvent;
    onUnitDamaged?: UnitEvent;
    onUnitCreated?: UnitEvent;
    onUnitFinished?: UnitEvent;
    onEnemyFirstSeen?: UnitEvent;
    onUnitDestroyed?: UnitEvent;
    onUnitHasEngaged?: UnitEvent;
    onUnitHasSwitchedTargets?: UnitEvent;
}

type EventHandler = (resources: World, data?: any, event?: SystemEvent) => any;
type EventReader<T> = T & EventConsumer & { [index: string]: any };

interface EngineObject extends SystemObject {
    type: 'engine';
}

interface AgentObject extends SystemObject {
    type?: 'agent' | 'build';
    settings?: {
        type?: SC2APIProtocol.PlayerType;
        race?: SC2APIProtocol.Race;
    },
    interface?: SC2APIProtocol.InterfaceOptions;
}

type AgentSystem = EventReader<AgentObject>;

type Earmark = {
    name: string;
    minerals: number;
    vespene: number;
}

interface StorageBlueprint {
    register: (name: string, fn: Function) => void;
    mineralCost: (unitType: number) => number;
    getAbilityData: (abilityId: number) => SC2APIProtocol.AbilityData;
    getUpgradeData: (upgradeId: number) => SC2APIProtocol.UpgradeData;
    getUnitTypeData: (unitTypeId: number) => SC2APIProtocol.UnitTypeData;
    findUnitTypesWithAbility: (abilityId: number) => number[];
    addEarmark: (earmark: Earmark) => Earmark[];
    getEarmarkTotals: (earmarkName: string) => Earmark;
    settleEarmark: (earmarkName: string) => Earmark[];
}

type DataStorage = StorageBlueprint & Map<string, any>;

type ResourceContainer = {
    actions: ActionManager;
    events: EventChannel;
    frame: FrameResource;
    map: MapResource;
    units: UnitResource;
    debug?: Debugger;
}

type IncomingResources = Partial<ResourceContainer>;

interface ResourceManager {
    set: (resource: IncomingResources) => void;
    get: () => Readonly<ResourceContainer>;
}

interface World {
    agent: Agent;
    data: DataStorage;
    resources: ResourceManager;
}

type EngineOptions = {
    host?: string;
    port?: number;
    launch?: boolean;
}

type GameResult = [World, SC2APIProtocol.PlayerResult[]];

type LauncherOptions = {
    listen?: string;
    port?: number;
    force?: boolean;
    forceAll?: boolean;
    displayMode?: number;
}

type Launcher = (options: LauncherOptions) => NodeJS.Process | number;

interface Engine {
    lastRequest?: [number, number];
    loopDelay?: number;
    launcher: Launcher;
    use(systems: SystemWrapper<EngineObject>): void;
    use(systems: SystemWrapper<EngineObject>[]): void;
    connect: () => Promise<SC2APIProtocol.ResponsePing>;
    runGame: (map: string, players: Array<{ type: number, race: number, agent?: Agent }>) => Promise<GameResult>
    createGame: (map: string, playerSetup: SC2APIProtocol.PlayerSetup[], realtime?: boolean) => Promise<SC2APIProtocol.ResponseCreateGame>;
    joinGame: (agent: Agent, options?: object) => Promise<GameResult>;
    runLoop: () => Promise<GameResult>;
    dispatch: () => Promise<any>;
    systems: SystemWrapper<EngineObject>[];
    firstRun: () => Promise<GameResult>
    onGameEnd: (results: SC2APIProtocol.PlayerResult[]) => GameResult;
}
