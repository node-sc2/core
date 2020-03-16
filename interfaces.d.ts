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

type SystemType = 'engine' | 'agent' | 'build' | 'unit';

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
    buildOptions?: {
        paused?: boolean;
        earmarks: null | number;
    }
    pauseBuild?: () => void;
    resumeBuild?: () => void;
    buildComplete?: (world: World, gameLoop: number) => Promise<any>;
    idleFunctions?: IdleFunctions;
}

type IdleFunctions = {
    [key: string]: (world: World, unit: Unit) => Promise<any>;
    [index: number]: (world: World, unit: Unit) => Promise<any>;
    labeled?: (world: World, unit: Unit, label?: string) => Promise<any>;
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
    opts?: {
        near?: boolean;
        on?: UnitTypeId;
        skip?: string;
        target?: UnitTypeId;
    };
    index?: number;
    touched?: boolean;
    supply?: number;
    started?: (null | number);
    earmarked?: boolean;
    status?: BuildOrderStatus;
}

type BuildTask = BuildTaskI | [number, BuildTaskI];

type BuildHelper = (...args) => BuildTaskI;

type BuilderFunction = (world: World, task: BuildTaskI) => BuildTaskI;

type BuildFunction = (world: World, buildStep: BuildTaskI) => Promise<BuildOrderStatus>;

interface System extends SystemObject {
    readerId?: string;
    state: GenericState;
    pause(): void;
    unpause(): void;
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
    _system: System;
}

type Opponent = {
    id: string;
    race: SC2APIProtocol.Race;
}

interface PlayerData extends SC2APIProtocol.PlayerCommon, SC2APIProtocol.PlayerRaw { }

interface Agent extends PlayerData {
    _world: World;
    inGame?: boolean;
    readerId?: string;
    onGameStart: (world: World) => Promise<any>;
    onStep?: (resources: World) => void;
    interface: SC2APIProtocol.InterfaceOptions;
    canAfford(unitTypeId: number, earmarkName?: string): boolean;
    canAffordN(unitTypeId: number, nQtyMax?: number): number;
    canAffordUpgrade: (upgradeId: number) => boolean;
    hasTechFor: (unitTypeId: number) => boolean;
    race?: SC2APIProtocol.Race;
    opponent?: Opponent;
    settings: SC2APIProtocol.PlayerSetup;
    systems: SystemWrapper<System>[];
    use: (sys: (SystemWrapper<System> | SystemWrapper<System>[])) => void;
    setup: (world: World) => void;
}

type UnitTypeGroup = Array<number>;

interface Unit extends SC2APIProtocol.Unit {
    _availableAbilities: Array<number>;
    noQueue?: boolean;
    lastSeen?: number;
    labels: Map<string, any>;
    abilityAvailable: (abilityId: number) => boolean;
    availableAbilities: () => Array<number>;
    data: () => SC2APIProtocol.UnitTypeData;
    is: (unitType: UnitTypeId) => boolean;
    isCloaked: () => boolean;
    isConstructing: () => boolean;
    isCombatUnit: () => boolean;
    isEnemy: () => boolean;
    isFinished: () => boolean;
    isWorker: () => boolean;
    isTownhall: () => boolean;
    isGasMine: () => boolean;
    isMineralField: () => boolean;
    isStructure: () => boolean;
    isIdle: () => boolean;
    isCurrent: () => boolean;
    isHolding: () => boolean;
    isGathering: (type?: 'minerals' | 'vespene') => boolean;
    isReturning: () => boolean;
    hasReactor: () => boolean;
    hasTechLab: () => boolean;
    hasNoLabels: () => boolean;
    canInject: () => boolean;
    canBlink: () => boolean;
    canMove: () => boolean;
    canShootUp: () => boolean;
    update: (unit: SC2APIProtocol.Unit) => void;
    inject: (target?: Unit) => Promise<SC2APIProtocol.ResponseAction>;
    blink: (target: Point2D, opts: AbilityOptions) => Promise<SC2APIProtocol.ResponseAction>;
    toggle: (options: AbilityOptions) => Promise<SC2APIProtocol.ResponseAction>;
    burrow: (options: AbilityOptions) => Promise<SC2APIProtocol.ResponseAction>;
    addLabel: (name: string, value: any) => Map<string, any>;
    hasLabel: (name: string) => boolean;
    getLife: () => number;
    getLabel: (name: string) => any;
    removeLabel: (name: string) => boolean;
}

interface UnitResource {
    _units: {
        [k: number]: Map<string, Unit>; // 1 = Self, 3 = Neutral, 4 = Enemy
    };
    clone: () => Map<string, Unit>;
    getBases(filter?: (number | UnitFilter)): Unit[];
    getCombatUnits(): Unit[];
    getRangedCombatUnits(): Unit[];
    getAll: (filter?: (number | UnitFilter)) => Unit[];
    getAlive: (filter?: (number | UnitFilter)) => Unit[];
    getById: (unitTypeId: number, filter?: UnitFilter) => Unit[];
    getByTag(unitTags: string): Unit;
    getByTag(unitTags: string[]): Unit[];
    getClosest(pos: Point2D, units: Unit[], n?: number): Unit[];
    getClosest(pos: Point2D, units: SC2APIProtocol.PowerSource[], n?: number): SC2APIProtocol.PowerSource[];
    getByType: (unitTypeIds: (number | UnitTypeGroup)) => Unit[];
    getProductionUnits: (unitTypeId: number) => Unit[];
    getUpgradeFacilities: (upgradeId: number) => Unit[];
    getMineralFields: (filter?: UnitFilter) => Unit[];
    getGasGeysers: (filter?: UnitFilter) => Unit[];
    getGasMines: () => Unit[];
    getStructures: (filter?: UnitFilter) => Unit[];
    getWorkers: (includeBusy?: boolean) => Unit[];
    getIdleWorkers: () => Unit[];
    getMineralWorkers: () => Unit[];
    getConstructingWorkers: () => Unit[];
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
    wall?: Array<Point2D>;
    areaFill: Array<Point2D>;
    placementGrid: Array<Point2D>;
    mineralLine: Array<Point2D>;
    behindMineralLine: Array<Point2D>;
}

interface Expansion {
    base?: string; // entity tag ref of base Unit
    areas?: ExpansionArea;
    getWall(): Array<Point2D>;
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
    height?: Grid2D;
    miniMap?: Grid2D;
    placement?: Grid2D;
    pathing?: Grid2D;
}

type Locations = {
    self: Point2D;
    enemy: Point2D[];
}

type MapPathOptions = {
    graph?: any;
    force?: boolean
    diagonal?: boolean;
}

interface MapResource {
    _activeEffects: Array<SC2APIProtocol.Effect>;
    _grids: Grids;
    _locations: Locations;
    _expansions: ReadonlyArray<Expansion>;
    _expansionsFromEnemy: ReadonlyArray<Expansion>;
    _graph: any;
    _mapState: {
        creep: Grid2D;
        visibility: Grid2D;
    };
    _mapSize: SC2APIProtocol.Size2DI;
    _ramps: Point3D[];
    isCustom: () => boolean;
    isPathable: (point: Point2D) => boolean;
    setPathable: (point: Point2D, pathable: boolean) => void;
    isPlaceable: (point: Point2D) => boolean;
    isPlaceableAt: (unitType: number, pos: Point2D) => boolean;
    setPlaceable: (point: Point2D, placeable: boolean) => void;
    isVisible: (point: Point2D) => boolean;
    hasCreep: (point: Point2D) => boolean;
    freeGasGeysers: () => Unit[];
    getCreep: () => Point2D[];
    getEffects: () => Array<SC2APIProtocol.Effect>;
    getGrids: () => Grids;
    getLocations: () => Locations;
    getExpansions: (alliance?: SC2APIProtocol.Alliance) => Expansion[];
    getMain: () => Expansion;
    getEnemyMain: () => Expansion;
    getNatural: () => Expansion;
    getEnemyNatural: () => Expansion;
    getThirds: () => Expansion[];
    getEnemyThirds: () => Expansion[];
    getHeight: (point: Point2D) => number;
    getClosestExpansion: (point: Point2D) => Expansion;
    getAvailableExpansions: () => Expansion[];
    getOccupiedExpansions: (alliance?: SC2APIProtocol.Alliance) => Expansion[];
    getCombatRally: () => Point2D;
    getSize: () => SC2APIProtocol.Size2DI;
    getCenter: () => Point2D;
    closestPathable: (point: Point2D) => Point2D;
    setActiveEffects: (currEffects: Array<SC2APIProtocol.Effect>) => void;
    setGrids: (grids: Grids) => void;
    setSize: (mapSize: SC2APIProtocol.Size2DI) => void;
    setGraph: (graph?: any) => void;
    getGraph: () => any;
    newGraph: (grid: Grid2D) => any;
    setLocations: (locations: Locations) => void;
    setMapState: (mapState: { visibility: Grid2D, creep: Grid2D }) => void;
    setRamps: (points: Point3D[]) => void;
    path: (start: Point2D, end: Point2D, opts?: MapPathOptions) => number[][];
    setExpansions: (expansions: Expansion[]) => void;
}

interface MapSystem extends EngineObject, EventConsumer { }

type AbilityOptions = {
    target?: Unit | Point2D, 
    queue?: boolean,
}

type WarpInOptions = {
    nearPosition?: Point2D;
    maxQty?: number;
    highground?: true;
}

interface ActionManager {
    _client?: NodeSC2Proto.ProtoClient;
    attack(units?: Unit[], unit?: Unit, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    attackMove(u?: Unit[], p?: Point2D, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    build(unitTypeId: number, target?: Unit, worker?: Unit): Promise<SC2APIProtocol.ResponseAction>;
    build(unitTypeId: number, pos?: Point2D, worker?: Unit): Promise<SC2APIProtocol.ResponseAction>;
    do(abilityId: number, tags: string, opts?: AbilityOptions ): Promise<SC2APIProtocol.ResponseAction>;
    do(abilityId: number, tags: string[], opts?: AbilityOptions): Promise<SC2APIProtocol.ResponseAction>;
    buildGasMine: () => Promise<SC2APIProtocol.ResponseAction>;
    gather: (unit: Unit, mineralField?: Unit, queue?: boolean) => Promise<SC2APIProtocol.ResponseAction>;
    mine: (units: Unit[], target: Unit, queue?: boolean) => Promise<SC2APIProtocol.ResponseAction>;
    move(units: Unit, target: Point2D, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    move(units: Unit[], target: Point2D, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    move(units: Unit, target: Unit, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    move(units: Unit[], target: Unit, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    patrol(unit: Unit, positions: Array<[Point2D, Point2D]>, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    patrol(unit: Unit[], positions: Array<[Point2D, Point2D]>, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    train: (unitTypeId: number, unit?: Unit) => Promise<SC2APIProtocol.ResponseAction>;
    upgrade: (upgradeId: number, tag?: Unit) => Promise<SC2APIProtocol.ResponseAction>;
    smart(units: Unit[], target: Point2D, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    smart(units: Unit[], target: Unit, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
    swapBuildings(unitA: Unit, unitB: Unit): Promise<null>;
    warpIn(unitTypeId: number, opts: WarpInOptions): Promise<SC2APIProtocol.ResponseAction>;
    canPlace: (unitTypeId: number, positions: Point2D[]) => Promise<(Point2D | false)>;
    sendAction(unitCommand: SC2APIProtocol.ActionRawUnitCommand): Promise<SC2APIProtocol.ResponseAction>;
    sendAction(unitCommand: SC2APIProtocol.ActionRawUnitCommand[]): Promise<SC2APIProtocol.ResponseAction>;
    sendQuery: (query: SC2APIProtocol.RequestQuery) => Promise<SC2APIProtocol.ResponseQuery>;
}

type Color = {
    r: number;
    g: number;
    b: number;
}

type WPoint = {
    pos: SC2APIProtocol.Point;
    color?: Color;
    size?: number;
    text?: string;
    max?: SC2APIProtocol.Point;
}

type ShapeDrawFn = (id: string, points: Array<WPoint>, opts?: {
    height?: number;
    cube?: boolean;
    zPos?: number;
    color?: Color;
    size?: number;
    temp?: boolean;
    persistText?: boolean;
    includeText?: boolean;
}) => void;

type TextDrawFn = (id: string, points: Array<{
    pos: SC2APIProtocol.Point;
    text: string;
    size?: number;
    color?: Color;
}>, opts?: {
    zPos?: number;
    color?: Color;
    size?: number;
    temp?: boolean;
}) => void;

type LineDrawFn = (id: string, points: Array<SC2APIProtocol.Line & {
    color?: Color;
    text: string;
}>, opts?: {
    zPos?: number;
    color?: Color;
    includeText?: boolean;
}) => void;

type UnitRequest = Array<SC2APIProtocol.DebugCreateUnit>;

interface Debugger {
    touched: boolean;
    updateScreen: () => Promise<SC2APIProtocol.ResponseDebug>;
    removeCommand: (id: string) => void;
    setRegions: (expansions: Expansion[]) => void;
    setDrawCells: ShapeDrawFn;
    setDrawSpheres: ShapeDrawFn;
    setDrawTextWorld: TextDrawFn;
    setDrawLines: LineDrawFn;
    setDrawTextScreen: TextDrawFn;
    createUnit(ureqs: UnitRequest): Promise<SC2APIProtocol.ResponseDebug>;
    createUnit(ureqs: UnitRequest[]): Promise<SC2APIProtocol.ResponseDebug>;
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
    _result?: Array<SC2APIProtocol.PlayerResult>;
    _score: SC2APIProtocol.Score;
    _render: SC2APIProtocol.ObservationRender;
    _feature: SC2APIProtocol.ObservationFeatureLayer;
    getObservation: () => SC2APIProtocol.Observation;
    getGameInfo: () => SC2APIProtocol.ResponseGameInfo;
    getGameLoop: () => number;
    getPrevious: () => GameFrame;
    getEffects: () => Array<SC2APIProtocol.Effect>;
    getMapState: () => SC2APIProtocol.MapState;
    getRender: () => SC2APIProtocol.ObservationRender;
    getScore: () => SC2APIProtocol.Score;
    getFeatureLayer: () => SC2APIProtocol.ObservationFeatureLayer;
    timeInSeconds: () => number;
}

interface FrameSystem extends EngineObject {
    onStep: (world: World) => Promise<any>;
    onGameStart: (world: World) => Promise<any>;
}

type ReaderId = string;

type EventType = 'engine' | 'agent' | 'build' | 'unit' | 'all';

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
    onStep?: (world: World, gameLoop: number) => Promise<any>;
    onGameStart?: (world: World) => Promise<any>;
    onUpgradeComplete?: (world: World, upgradeId: number) => Promise<any>;
    onChatReceived?: (world: World, chat: SC2APIProtocol.ChatReceived) => Promise<any>;
    onUnitIdle?: UnitEvent;
    onUnitDamaged?: UnitEvent;
    onUnitCreated?: UnitEvent;
    onUnitFinished?: UnitEvent;
    onEnemyFirstSeen?: UnitEvent;
    onUnitDestroyed?: UnitEvent;
    onUnitHasEngaged?: UnitEvent;
    onUnitHasDisengaged?: UnitEvent;
    onUnitHasSwitchedTargets?: UnitEvent;
    onNewEffect?: (world: World, effect: SC2APIProtocol.Effect & SC2APIProtocol.EffectData & {
        effectGrid: Array<Point2D>;
    }) => Promise<any>;
    onExpiredEffect?: (world: World, effect: SC2APIProtocol.Effect & SC2APIProtocol.EffectData) => Promise<any>;
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
    getEffectData: (effectId: number) => SC2APIProtocol.EffectData;
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
    _lastRequest?: [number, number];
    _loopDelay?: number;
    _totalLoopDelay?: number;
    _gameLeft: boolean;
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
    getWorld: () => World
    onGameEnd: (results: SC2APIProtocol.PlayerResult[]) => GameResult;
}
