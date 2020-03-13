'use strict';

const api = require('@node-sc2/proto/root');

// these enums are unique to node-sc2

/**
 * @enum {number}
 */
const BuildOrder = {
    NOT_STARTED: 0,
    COMMAND_GIVEN: 1,
    IN_PROGRESS: 2,
    COMPLETE: 3,
    SKIPPED: 4,
};

const BuildOrderId = {
    0: 'NOT_STARTED',
    1: 'COMMAND_GIVEN',
    2: 'IN_PROGRESS',
    3: 'COMPLETE',
    4: 'SKIPPED',
};

/**
 * @enum {number}
 */
const BuildResult = {
    SUCCESS: 0,
    COMMAND_SENT: 1,
    CANNOT_SATISFY: 2,
    ERROR: 3,
    SKIPPED: 4,
};

/**
 * these enums are pulled straight from SC2APIProtocol. We could just grab
 * them from the proto defs, but redefining them here is better as a reference
 * rather than relying on importing magic constants from external deps. However,
 * the reverse (id-based enums) *are* taken from protobuf, to reduce redundency.
 */

/**
 * @enum {SC2APIProtocol.Alert}
 */
const Alert = {
    NUCLEARLAUNCHDETECTED: 1,
    NYDUSWORMDETECTED: 2
};

const { valuesById: AlertId } = api.lookupEnum('Alert');

/**
 * @enum {SC2APIProtocol.Alliance}
 */
const Alliance = {
    SELF: 1,
    ALLY: 2,
    NEUTRAL: 3,
    ENEMY: 4,
};

const { valuesById: AllianceId } = api.lookupEnum('Alliance');

/**
 * @enum {SC2APIProtocol.Attribute}
 */
const Attribute = {
    LIGHT: 1,
    ARMORED: 2,
    BIOLOGICAL: 3,
    MECHANICAL: 4,
    ROBOTIC: 5,
    PSIONIC: 6,
    MASSIVE: 7,
    STRUCTURE: 8,
    HOVER: 9,
    HEROIC: 10,
    SUMMONED: 11,
};

const { valuesById: AttributeId } = api.lookupEnum('Attribute');

/**
 * @enum {SC2APIProtocol.Difficulty}
 */
const Difficulty = {
    VERYEASY: 1,
    EASY: 2,
    MEDIUM: 3,
    MEDIUMHARD: 4,
    HARD: 5,
    HARDER: 6,
    VERYHARD: 7,
    CHEATVISION: 8,
    CHEATMONEY: 9,
    CHEATINSANE: 10
};

const { valuesById: DifficultyId } = api.lookupEnum('Difficulty');

/**
 * @enum {SC2APIProtocol.DisplayType}
 */
const DisplayType = {
    VISIBLE: 1,
    SNAPSHOT: 2,
    HIDDEN: 3,
};

const { valuesById: DisplayTypeId } = api.lookupEnum('DisplayType');

/**
 * @enum {SC2APIProtocol.Result}
 */
const GameResult = {
    VICTORY: 1,
    DEFEAT: 2,
    TIE: 3,
    UNDECIDED: 4
};

const { valuesById: GameResultId } = api.lookupEnum('Result');

/**
 * @enum {SC2APIProtocol.PlayerType}
 */
const PlayerType = {
    PARTICIPANT: 1,
    COMPUTER: 2,
    OBSERVER: 3
};

const { valuesById: PlayerTypeId } = api.lookupEnum('PlayerType');

/**
 * @enum {SC2APIProtocol.Race}
 */
const Race = {
    NORACE: 0,
    TERRAN: 1,
    ZERG: 2,
    PROTOSS: 3,
    RANDOM: 4
};

const { valuesById: RaceId } = api.lookupEnum('Race');

/**
 * @enum {SC2APIProtocol.Status}
 */
const Status = {
    LAUNCHED: 1,
    INIT_GAME: 2,
    IN_GAME: 3,
    IN_REPLAY: 4,
    ENDED: 5,
    QUIT: 6,
    UNKNOWN: 99
};

const { valuesById: StatusId } = api.lookupEnum('Status');

/**
 * @enum {SC2APIProtocol.Weapon_TargetType}
 */
const WeaponTargetType = {
    GROUND: 1,
    AIR: 2,
    ANY: 3,
};

const { valuesById: WeaponTargetTypeId } = api.lookupEnum('TargetType');

/**
 * @enum {SC2APIProtocol.AbilityData_Target}
 */
const AbilityDataTarget = {
    NONE: 1,
    POINT: 2,
    UNIT: 3,
    POINTORUNIT: 4,
    POINTORNONE: 5,
};

const { valuesById: AbilityDataTargetId } = api.lookupType('AbilityData').lookupEnum('Target');

/**
 * @enum {SC2APIProtocol.CloakState}
 */
const CloakState = {
    CLOAKED: 1,
    CLOAKEDDETECTED: 2,
    NOTCLOAKED: 3,
};

const { valuesById: CloakStateId } = api.lookupEnum('CloakState');

module.exports = {
    AbilityDataTarget,
    AbilityDataTargetId,
    Alert,
    AlertId,
    Alliance,
    AllianceId,
    Attribute,
    AttributeId,
    BuildOrder,
    BuildOrderId,
    BuildResult,
    CloakState,
    CloakStateId,
    Difficulty,
    DifficultyId,
    DisplayType,
    DisplayTypeId,
    GameResult,
    GameResultId,
    PlayerType,
    PlayerTypeId,
    Race,
    RaceId,
    Status,
    StatusId,
    WeaponTargetType,
    WeaponTargetTypeId,
};