"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeClientMessage = exports.encodeClientMessage = exports.decodeServerMessage = exports.encodeServerMessage = exports.decodePerformanceMetrics = exports.encodePerformanceMetrics = exports.decodeInputAcknowledgment = exports.encodeInputAcknowledgment = exports.decodeRollbackCorrection = exports.encodeRollbackCorrection = exports.decodePredictiveInput = exports.encodePredictiveInput = exports.decodeDeltaGameState = exports.encodeDeltaGameState = exports.decodeQueueState = exports.encodeQueueState = exports.decodeScoreState = exports.encodeScoreState = exports.decodeGameState = exports.encodeGameState = exports.decodeStrategyState = exports.encodeStrategyState = exports.decodeMovingObjectState = exports.encodeMovingObjectState = exports.decodePlayerState = exports.encodePlayerState = exports.decodeArrowState = exports.encodeArrowState = void 0;
function encodeArrowState(message) {
    var bb = popByteBuffer();
    _encodeArrowState(message, bb);
    return toUint8Array(bb);
}
exports.encodeArrowState = encodeArrowState;
function _encodeArrowState(message, bb) {
    // repeated int32 position = 1;
    var array$position = message.position;
    if (array$position !== undefined) {
        var packed = popByteBuffer();
        for (var _i = 0, array$position_1 = array$position; _i < array$position_1.length; _i++) {
            var value = array$position_1[_i];
            writeVarint64(packed, intToLong(value));
        }
        writeVarint32(bb, 10);
        writeVarint32(bb, packed.offset);
        writeByteBuffer(bb, packed);
        pushByteBuffer(packed);
    }
    // optional string direction = 2;
    var $direction = message.direction;
    if ($direction !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $direction);
    }
    // optional string color = 3;
    var $color = message.color;
    if ($color !== undefined) {
        writeVarint32(bb, 26);
        writeString(bb, $color);
    }
}
function decodeArrowState(binary) {
    return _decodeArrowState(wrapByteBuffer(binary));
}
exports.decodeArrowState = decodeArrowState;
function _decodeArrowState(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated int32 position = 1;
            case 1: {
                var values = message.position || (message.position = []);
                if ((tag & 7) === 2) {
                    var outerLimit = pushTemporaryLength(bb);
                    while (!isAtEnd(bb)) {
                        values.push(readVarint32(bb));
                    }
                    bb.limit = outerLimit;
                }
                else {
                    values.push(readVarint32(bb));
                }
                break;
            }
            // optional string direction = 2;
            case 2: {
                message.direction = readString(bb, readVarint32(bb));
                break;
            }
            // optional string color = 3;
            case 3: {
                message.color = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodePlayerState(message) {
    var bb = popByteBuffer();
    _encodePlayerState(message, bb);
    return toUint8Array(bb);
}
exports.encodePlayerState = encodePlayerState;
function _encodePlayerState(message, bb) {
    // optional int32 colorIndex = 1;
    var $colorIndex = message.colorIndex;
    if ($colorIndex !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, intToLong($colorIndex));
    }
    // optional string name = 2;
    var $name = message.name;
    if ($name !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $name);
    }
    // repeated int32 position = 3;
    var array$position = message.position;
    if (array$position !== undefined) {
        var packed = popByteBuffer();
        for (var _i = 0, array$position_2 = array$position; _i < array$position_2.length; _i++) {
            var value = array$position_2[_i];
            writeVarint64(packed, intToLong(value));
        }
        writeVarint32(bb, 26);
        writeVarint32(bb, packed.offset);
        writeByteBuffer(bb, packed);
        pushByteBuffer(packed);
    }
    // optional int32 totalPoints = 4;
    var $totalPoints = message.totalPoints;
    if ($totalPoints !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, intToLong($totalPoints));
    }
    // repeated ArrowState arrows = 5;
    var array$arrows = message.arrows;
    if (array$arrows !== undefined) {
        for (var _a = 0, array$arrows_1 = array$arrows; _a < array$arrows_1.length; _a++) {
            var value = array$arrows_1[_a];
            writeVarint32(bb, 42);
            var nested = popByteBuffer();
            _encodeArrowState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
function decodePlayerState(binary) {
    return _decodePlayerState(wrapByteBuffer(binary));
}
exports.decodePlayerState = decodePlayerState;
function _decodePlayerState(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int32 colorIndex = 1;
            case 1: {
                message.colorIndex = readVarint32(bb);
                break;
            }
            // optional string name = 2;
            case 2: {
                message.name = readString(bb, readVarint32(bb));
                break;
            }
            // repeated int32 position = 3;
            case 3: {
                var values = message.position || (message.position = []);
                if ((tag & 7) === 2) {
                    var outerLimit = pushTemporaryLength(bb);
                    while (!isAtEnd(bb)) {
                        values.push(readVarint32(bb));
                    }
                    bb.limit = outerLimit;
                }
                else {
                    values.push(readVarint32(bb));
                }
                break;
            }
            // optional int32 totalPoints = 4;
            case 4: {
                message.totalPoints = readVarint32(bb);
                break;
            }
            // repeated ArrowState arrows = 5;
            case 5: {
                var limit = pushTemporaryLength(bb);
                var values = message.arrows || (message.arrows = []);
                values.push(_decodeArrowState(bb));
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeMovingObjectState(message) {
    var bb = popByteBuffer();
    _encodeMovingObjectState(message, bb);
    return toUint8Array(bb);
}
exports.encodeMovingObjectState = encodeMovingObjectState;
function _encodeMovingObjectState(message, bb) {
    // repeated int32 position = 1;
    var array$position = message.position;
    if (array$position !== undefined) {
        var packed = popByteBuffer();
        for (var _i = 0, array$position_3 = array$position; _i < array$position_3.length; _i++) {
            var value = array$position_3[_i];
            writeVarint64(packed, intToLong(value));
        }
        writeVarint32(bb, 10);
        writeVarint32(bb, packed.offset);
        writeByteBuffer(bb, packed);
        pushByteBuffer(packed);
    }
    // optional string direction = 2;
    var $direction = message.direction;
    if ($direction !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $direction);
    }
    // optional string color = 3;
    var $color = message.color;
    if ($color !== undefined) {
        writeVarint32(bb, 26);
        writeString(bb, $color);
    }
}
function decodeMovingObjectState(binary) {
    return _decodeMovingObjectState(wrapByteBuffer(binary));
}
exports.decodeMovingObjectState = decodeMovingObjectState;
function _decodeMovingObjectState(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated int32 position = 1;
            case 1: {
                var values = message.position || (message.position = []);
                if ((tag & 7) === 2) {
                    var outerLimit = pushTemporaryLength(bb);
                    while (!isAtEnd(bb)) {
                        values.push(readVarint32(bb));
                    }
                    bb.limit = outerLimit;
                }
                else {
                    values.push(readVarint32(bb));
                }
                break;
            }
            // optional string direction = 2;
            case 2: {
                message.direction = readString(bb, readVarint32(bb));
                break;
            }
            // optional string color = 3;
            case 3: {
                message.color = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeStrategyState(message) {
    var bb = popByteBuffer();
    _encodeStrategyState(message, bb);
    return toUint8Array(bb);
}
exports.encodeStrategyState = encodeStrategyState;
function _encodeStrategyState(message, bb) {
    // repeated MovingObjectState mouses = 1;
    var array$mouses = message.mouses;
    if (array$mouses !== undefined) {
        for (var _i = 0, array$mouses_1 = array$mouses; _i < array$mouses_1.length; _i++) {
            var value = array$mouses_1[_i];
            writeVarint32(bb, 10);
            var nested = popByteBuffer();
            _encodeMovingObjectState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // repeated MovingObjectState cats = 2;
    var array$cats = message.cats;
    if (array$cats !== undefined) {
        for (var _a = 0, array$cats_1 = array$cats; _a < array$cats_1.length; _a++) {
            var value = array$cats_1[_a];
            writeVarint32(bb, 18);
            var nested = popByteBuffer();
            _encodeMovingObjectState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // repeated MovingObjectState walls = 3;
    var array$walls = message.walls;
    if (array$walls !== undefined) {
        for (var _b = 0, array$walls_1 = array$walls; _b < array$walls_1.length; _b++) {
            var value = array$walls_1[_b];
            writeVarint32(bb, 26);
            var nested = popByteBuffer();
            _encodeMovingObjectState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // repeated MovingObjectState goals = 4;
    var array$goals = message.goals;
    if (array$goals !== undefined) {
        for (var _c = 0, array$goals_1 = array$goals; _c < array$goals_1.length; _c++) {
            var value = array$goals_1[_c];
            writeVarint32(bb, 34);
            var nested = popByteBuffer();
            _encodeMovingObjectState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // optional string name = 5;
    var $name = message.name;
    if ($name !== undefined) {
        writeVarint32(bb, 42);
        writeString(bb, $name);
    }
}
function decodeStrategyState(binary) {
    return _decodeStrategyState(wrapByteBuffer(binary));
}
exports.decodeStrategyState = decodeStrategyState;
function _decodeStrategyState(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated MovingObjectState mouses = 1;
            case 1: {
                var limit = pushTemporaryLength(bb);
                var values = message.mouses || (message.mouses = []);
                values.push(_decodeMovingObjectState(bb));
                bb.limit = limit;
                break;
            }
            // repeated MovingObjectState cats = 2;
            case 2: {
                var limit = pushTemporaryLength(bb);
                var values = message.cats || (message.cats = []);
                values.push(_decodeMovingObjectState(bb));
                bb.limit = limit;
                break;
            }
            // repeated MovingObjectState walls = 3;
            case 3: {
                var limit = pushTemporaryLength(bb);
                var values = message.walls || (message.walls = []);
                values.push(_decodeMovingObjectState(bb));
                bb.limit = limit;
                break;
            }
            // repeated MovingObjectState goals = 4;
            case 4: {
                var limit = pushTemporaryLength(bb);
                var values = message.goals || (message.goals = []);
                values.push(_decodeMovingObjectState(bb));
                bb.limit = limit;
                break;
            }
            // optional string name = 5;
            case 5: {
                message.name = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeGameState(message) {
    var bb = popByteBuffer();
    _encodeGameState(message, bb);
    return toUint8Array(bb);
}
exports.encodeGameState = encodeGameState;
function _encodeGameState(message, bb) {
    // repeated PlayerState players = 1;
    var array$players = message.players;
    if (array$players !== undefined) {
        for (var _i = 0, array$players_1 = array$players; _i < array$players_1.length; _i++) {
            var value = array$players_1[_i];
            writeVarint32(bb, 10);
            var nested = popByteBuffer();
            _encodePlayerState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // optional StrategyState strategy = 2;
    var $strategy = message.strategy;
    if ($strategy !== undefined) {
        writeVarint32(bb, 18);
        var nested = popByteBuffer();
        _encodeStrategyState($strategy, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional int32 width = 3;
    var $width = message.width;
    if ($width !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($width));
    }
    // optional int32 height = 4;
    var $height = message.height;
    if ($height !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, intToLong($height));
    }
    // optional bool started = 5;
    var $started = message.started;
    if ($started !== undefined) {
        writeVarint32(bb, 40);
        writeByte(bb, $started ? 1 : 0);
    }
    // optional bool ready = 6;
    var $ready = message.ready;
    if ($ready !== undefined) {
        writeVarint32(bb, 48);
        writeByte(bb, $ready ? 1 : 0);
    }
    // optional int32 cols = 7;
    var $cols = message.cols;
    if ($cols !== undefined) {
        writeVarint32(bb, 56);
        writeVarint64(bb, intToLong($cols));
    }
    // optional int32 rows = 8;
    var $rows = message.rows;
    if ($rows !== undefined) {
        writeVarint32(bb, 64);
        writeVarint64(bb, intToLong($rows));
    }
}
function decodeGameState(binary) {
    return _decodeGameState(wrapByteBuffer(binary));
}
exports.decodeGameState = decodeGameState;
function _decodeGameState(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated PlayerState players = 1;
            case 1: {
                var limit = pushTemporaryLength(bb);
                var values = message.players || (message.players = []);
                values.push(_decodePlayerState(bb));
                bb.limit = limit;
                break;
            }
            // optional StrategyState strategy = 2;
            case 2: {
                var limit = pushTemporaryLength(bb);
                message.strategy = _decodeStrategyState(bb);
                bb.limit = limit;
                break;
            }
            // optional int32 width = 3;
            case 3: {
                message.width = readVarint32(bb);
                break;
            }
            // optional int32 height = 4;
            case 4: {
                message.height = readVarint32(bb);
                break;
            }
            // optional bool started = 5;
            case 5: {
                message.started = !!readByte(bb);
                break;
            }
            // optional bool ready = 6;
            case 6: {
                message.ready = !!readByte(bb);
                break;
            }
            // optional int32 cols = 7;
            case 7: {
                message.cols = readVarint32(bb);
                break;
            }
            // optional int32 rows = 8;
            case 8: {
                message.rows = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeScoreState(message) {
    var bb = popByteBuffer();
    _encodeScoreState(message, bb);
    return toUint8Array(bb);
}
exports.encodeScoreState = encodeScoreState;
function _encodeScoreState(message, bb) {
    // repeated PlayerState players = 1;
    var array$players = message.players;
    if (array$players !== undefined) {
        for (var _i = 0, array$players_2 = array$players; _i < array$players_2.length; _i++) {
            var value = array$players_2[_i];
            writeVarint32(bb, 10);
            var nested = popByteBuffer();
            _encodePlayerState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
function decodeScoreState(binary) {
    return _decodeScoreState(wrapByteBuffer(binary));
}
exports.decodeScoreState = decodeScoreState;
function _decodeScoreState(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated PlayerState players = 1;
            case 1: {
                var limit = pushTemporaryLength(bb);
                var values = message.players || (message.players = []);
                values.push(_decodePlayerState(bb));
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeQueueState(message) {
    var bb = popByteBuffer();
    _encodeQueueState(message, bb);
    return toUint8Array(bb);
}
exports.encodeQueueState = encodeQueueState;
function _encodeQueueState(message, bb) {
    // optional GameState state = 1;
    var $state = message.state;
    if ($state !== undefined) {
        writeVarint32(bb, 10);
        var nested = popByteBuffer();
        _encodeGameState($state, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
}
function decodeQueueState(binary) {
    return _decodeQueueState(wrapByteBuffer(binary));
}
exports.decodeQueueState = decodeQueueState;
function _decodeQueueState(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional GameState state = 1;
            case 1: {
                var limit = pushTemporaryLength(bb);
                message.state = _decodeGameState(bb);
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeDeltaGameState(message) {
    var bb = popByteBuffer();
    _encodeDeltaGameState(message, bb);
    return toUint8Array(bb);
}
exports.encodeDeltaGameState = encodeDeltaGameState;
function _encodeDeltaGameState(message, bb) {
    // optional int64 baseSequence = 1;
    var $baseSequence = message.baseSequence;
    if ($baseSequence !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $baseSequence);
    }
    // optional int64 deltaSequence = 2;
    var $deltaSequence = message.deltaSequence;
    if ($deltaSequence !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $deltaSequence);
    }
    // optional int64 timestamp = 3;
    var $timestamp = message.timestamp;
    if ($timestamp !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, $timestamp);
    }
    // repeated int32 changedPlayerIds = 4;
    var array$changedPlayerIds = message.changedPlayerIds;
    if (array$changedPlayerIds !== undefined) {
        var packed = popByteBuffer();
        for (var _i = 0, array$changedPlayerIds_1 = array$changedPlayerIds; _i < array$changedPlayerIds_1.length; _i++) {
            var value = array$changedPlayerIds_1[_i];
            writeVarint64(packed, intToLong(value));
        }
        writeVarint32(bb, 34);
        writeVarint32(bb, packed.offset);
        writeByteBuffer(bb, packed);
        pushByteBuffer(packed);
    }
    // repeated PlayerState changedPlayers = 5;
    var array$changedPlayers = message.changedPlayers;
    if (array$changedPlayers !== undefined) {
        for (var _a = 0, array$changedPlayers_1 = array$changedPlayers; _a < array$changedPlayers_1.length; _a++) {
            var value = array$changedPlayers_1[_a];
            writeVarint32(bb, 42);
            var nested = popByteBuffer();
            _encodePlayerState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // repeated int32 changedEntityIds = 6;
    var array$changedEntityIds = message.changedEntityIds;
    if (array$changedEntityIds !== undefined) {
        var packed = popByteBuffer();
        for (var _b = 0, array$changedEntityIds_1 = array$changedEntityIds; _b < array$changedEntityIds_1.length; _b++) {
            var value = array$changedEntityIds_1[_b];
            writeVarint64(packed, intToLong(value));
        }
        writeVarint32(bb, 50);
        writeVarint32(bb, packed.offset);
        writeByteBuffer(bb, packed);
        pushByteBuffer(packed);
    }
    // repeated MovingObjectState changedEntities = 7;
    var array$changedEntities = message.changedEntities;
    if (array$changedEntities !== undefined) {
        for (var _c = 0, array$changedEntities_1 = array$changedEntities; _c < array$changedEntities_1.length; _c++) {
            var value = array$changedEntities_1[_c];
            writeVarint32(bb, 58);
            var nested = popByteBuffer();
            _encodeMovingObjectState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // optional float compressionRatio = 8;
    var $compressionRatio = message.compressionRatio;
    if ($compressionRatio !== undefined) {
        writeVarint32(bb, 69);
        writeFloat(bb, $compressionRatio);
    }
}
function decodeDeltaGameState(binary) {
    return _decodeDeltaGameState(wrapByteBuffer(binary));
}
exports.decodeDeltaGameState = decodeDeltaGameState;
function _decodeDeltaGameState(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 baseSequence = 1;
            case 1: {
                message.baseSequence = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 deltaSequence = 2;
            case 2: {
                message.deltaSequence = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 timestamp = 3;
            case 3: {
                message.timestamp = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // repeated int32 changedPlayerIds = 4;
            case 4: {
                var values = message.changedPlayerIds || (message.changedPlayerIds = []);
                if ((tag & 7) === 2) {
                    var outerLimit = pushTemporaryLength(bb);
                    while (!isAtEnd(bb)) {
                        values.push(readVarint32(bb));
                    }
                    bb.limit = outerLimit;
                }
                else {
                    values.push(readVarint32(bb));
                }
                break;
            }
            // repeated PlayerState changedPlayers = 5;
            case 5: {
                var limit = pushTemporaryLength(bb);
                var values = message.changedPlayers || (message.changedPlayers = []);
                values.push(_decodePlayerState(bb));
                bb.limit = limit;
                break;
            }
            // repeated int32 changedEntityIds = 6;
            case 6: {
                var values = message.changedEntityIds || (message.changedEntityIds = []);
                if ((tag & 7) === 2) {
                    var outerLimit = pushTemporaryLength(bb);
                    while (!isAtEnd(bb)) {
                        values.push(readVarint32(bb));
                    }
                    bb.limit = outerLimit;
                }
                else {
                    values.push(readVarint32(bb));
                }
                break;
            }
            // repeated MovingObjectState changedEntities = 7;
            case 7: {
                var limit = pushTemporaryLength(bb);
                var values = message.changedEntities || (message.changedEntities = []);
                values.push(_decodeMovingObjectState(bb));
                bb.limit = limit;
                break;
            }
            // optional float compressionRatio = 8;
            case 8: {
                message.compressionRatio = readFloat(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodePredictiveInput(message) {
    var bb = popByteBuffer();
    _encodePredictiveInput(message, bb);
    return toUint8Array(bb);
}
exports.encodePredictiveInput = encodePredictiveInput;
function _encodePredictiveInput(message, bb) {
    // optional string playerId = 1;
    var $playerId = message.playerId;
    if ($playerId !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $playerId);
    }
    // optional int64 sequence = 2;
    var $sequence = message.sequence;
    if ($sequence !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $sequence);
    }
    // optional int64 timestamp = 3;
    var $timestamp = message.timestamp;
    if ($timestamp !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, $timestamp);
    }
    // optional string inputType = 4;
    var $inputType = message.inputType;
    if ($inputType !== undefined) {
        writeVarint32(bb, 34);
        writeString(bb, $inputType);
    }
    // optional bytes inputData = 5;
    var $inputData = message.inputData;
    if ($inputData !== undefined) {
        writeVarint32(bb, 42);
        writeVarint32(bb, $inputData.length), writeBytes(bb, $inputData);
    }
    // optional float predictionConfidence = 6;
    var $predictionConfidence = message.predictionConfidence;
    if ($predictionConfidence !== undefined) {
        writeVarint32(bb, 53);
        writeFloat(bb, $predictionConfidence);
    }
}
function decodePredictiveInput(binary) {
    return _decodePredictiveInput(wrapByteBuffer(binary));
}
exports.decodePredictiveInput = decodePredictiveInput;
function _decodePredictiveInput(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string playerId = 1;
            case 1: {
                message.playerId = readString(bb, readVarint32(bb));
                break;
            }
            // optional int64 sequence = 2;
            case 2: {
                message.sequence = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 timestamp = 3;
            case 3: {
                message.timestamp = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional string inputType = 4;
            case 4: {
                message.inputType = readString(bb, readVarint32(bb));
                break;
            }
            // optional bytes inputData = 5;
            case 5: {
                message.inputData = readBytes(bb, readVarint32(bb));
                break;
            }
            // optional float predictionConfidence = 6;
            case 6: {
                message.predictionConfidence = readFloat(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeRollbackCorrection(message) {
    var bb = popByteBuffer();
    _encodeRollbackCorrection(message, bb);
    return toUint8Array(bb);
}
exports.encodeRollbackCorrection = encodeRollbackCorrection;
function _encodeRollbackCorrection(message, bb) {
    // optional string correctionId = 1;
    var $correctionId = message.correctionId;
    if ($correctionId !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $correctionId);
    }
    // optional int64 rollbackToSequence = 2;
    var $rollbackToSequence = message.rollbackToSequence;
    if ($rollbackToSequence !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $rollbackToSequence);
    }
    // optional int64 timestamp = 3;
    var $timestamp = message.timestamp;
    if ($timestamp !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, $timestamp);
    }
    // repeated string affectedPlayerIds = 4;
    var array$affectedPlayerIds = message.affectedPlayerIds;
    if (array$affectedPlayerIds !== undefined) {
        for (var _i = 0, array$affectedPlayerIds_1 = array$affectedPlayerIds; _i < array$affectedPlayerIds_1.length; _i++) {
            var value = array$affectedPlayerIds_1[_i];
            writeVarint32(bb, 34);
            writeString(bb, value);
        }
    }
    // repeated PlayerState corrections = 5;
    var array$corrections = message.corrections;
    if (array$corrections !== undefined) {
        for (var _a = 0, array$corrections_1 = array$corrections; _a < array$corrections_1.length; _a++) {
            var value = array$corrections_1[_a];
            writeVarint32(bb, 42);
            var nested = popByteBuffer();
            _encodePlayerState(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // optional string priority = 6;
    var $priority = message.priority;
    if ($priority !== undefined) {
        writeVarint32(bb, 50);
        writeString(bb, $priority);
    }
    // optional int32 smoothingDurationMs = 7;
    var $smoothingDurationMs = message.smoothingDurationMs;
    if ($smoothingDurationMs !== undefined) {
        writeVarint32(bb, 56);
        writeVarint64(bb, intToLong($smoothingDurationMs));
    }
}
function decodeRollbackCorrection(binary) {
    return _decodeRollbackCorrection(wrapByteBuffer(binary));
}
exports.decodeRollbackCorrection = decodeRollbackCorrection;
function _decodeRollbackCorrection(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string correctionId = 1;
            case 1: {
                message.correctionId = readString(bb, readVarint32(bb));
                break;
            }
            // optional int64 rollbackToSequence = 2;
            case 2: {
                message.rollbackToSequence = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 timestamp = 3;
            case 3: {
                message.timestamp = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // repeated string affectedPlayerIds = 4;
            case 4: {
                var values = message.affectedPlayerIds || (message.affectedPlayerIds = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated PlayerState corrections = 5;
            case 5: {
                var limit = pushTemporaryLength(bb);
                var values = message.corrections || (message.corrections = []);
                values.push(_decodePlayerState(bb));
                bb.limit = limit;
                break;
            }
            // optional string priority = 6;
            case 6: {
                message.priority = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 smoothingDurationMs = 7;
            case 7: {
                message.smoothingDurationMs = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeInputAcknowledgment(message) {
    var bb = popByteBuffer();
    _encodeInputAcknowledgment(message, bb);
    return toUint8Array(bb);
}
exports.encodeInputAcknowledgment = encodeInputAcknowledgment;
function _encodeInputAcknowledgment(message, bb) {
    // optional string playerId = 1;
    var $playerId = message.playerId;
    if ($playerId !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $playerId);
    }
    // optional int64 acknowledgedSequence = 2;
    var $acknowledgedSequence = message.acknowledgedSequence;
    if ($acknowledgedSequence !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $acknowledgedSequence);
    }
    // optional int64 timestamp = 3;
    var $timestamp = message.timestamp;
    if ($timestamp !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, $timestamp);
    }
    // optional int32 processingTimeMs = 4;
    var $processingTimeMs = message.processingTimeMs;
    if ($processingTimeMs !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, intToLong($processingTimeMs));
    }
    // optional bool accepted = 5;
    var $accepted = message.accepted;
    if ($accepted !== undefined) {
        writeVarint32(bb, 40);
        writeByte(bb, $accepted ? 1 : 0);
    }
    // optional string rejectionReason = 6;
    var $rejectionReason = message.rejectionReason;
    if ($rejectionReason !== undefined) {
        writeVarint32(bb, 50);
        writeString(bb, $rejectionReason);
    }
}
function decodeInputAcknowledgment(binary) {
    return _decodeInputAcknowledgment(wrapByteBuffer(binary));
}
exports.decodeInputAcknowledgment = decodeInputAcknowledgment;
function _decodeInputAcknowledgment(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string playerId = 1;
            case 1: {
                message.playerId = readString(bb, readVarint32(bb));
                break;
            }
            // optional int64 acknowledgedSequence = 2;
            case 2: {
                message.acknowledgedSequence = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 timestamp = 3;
            case 3: {
                message.timestamp = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 processingTimeMs = 4;
            case 4: {
                message.processingTimeMs = readVarint32(bb);
                break;
            }
            // optional bool accepted = 5;
            case 5: {
                message.accepted = !!readByte(bb);
                break;
            }
            // optional string rejectionReason = 6;
            case 6: {
                message.rejectionReason = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodePerformanceMetrics(message) {
    var bb = popByteBuffer();
    _encodePerformanceMetrics(message, bb);
    return toUint8Array(bb);
}
exports.encodePerformanceMetrics = encodePerformanceMetrics;
function _encodePerformanceMetrics(message, bb) {
    // optional float serverCpuUsage = 1;
    var $serverCpuUsage = message.serverCpuUsage;
    if ($serverCpuUsage !== undefined) {
        writeVarint32(bb, 13);
        writeFloat(bb, $serverCpuUsage);
    }
    // optional int64 serverMemoryMB = 2;
    var $serverMemoryMB = message.serverMemoryMB;
    if ($serverMemoryMB !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $serverMemoryMB);
    }
    // optional int32 activeConnections = 3;
    var $activeConnections = message.activeConnections;
    if ($activeConnections !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($activeConnections));
    }
    // optional float averageLatencyMs = 4;
    var $averageLatencyMs = message.averageLatencyMs;
    if ($averageLatencyMs !== undefined) {
        writeVarint32(bb, 37);
        writeFloat(bb, $averageLatencyMs);
    }
    // optional float currentFPS = 5;
    var $currentFPS = message.currentFPS;
    if ($currentFPS !== undefined) {
        writeVarint32(bb, 45);
        writeFloat(bb, $currentFPS);
    }
    // optional int32 playersCount = 6;
    var $playersCount = message.playersCount;
    if ($playersCount !== undefined) {
        writeVarint32(bb, 48);
        writeVarint64(bb, intToLong($playersCount));
    }
    // optional int64 gameStateSize = 7;
    var $gameStateSize = message.gameStateSize;
    if ($gameStateSize !== undefined) {
        writeVarint32(bb, 56);
        writeVarint64(bb, $gameStateSize);
    }
    // optional float compressionRatio = 8;
    var $compressionRatio = message.compressionRatio;
    if ($compressionRatio !== undefined) {
        writeVarint32(bb, 69);
        writeFloat(bb, $compressionRatio);
    }
    // optional float bandwidthUsageKbps = 9;
    var $bandwidthUsageKbps = message.bandwidthUsageKbps;
    if ($bandwidthUsageKbps !== undefined) {
        writeVarint32(bb, 77);
        writeFloat(bb, $bandwidthUsageKbps);
    }
    // optional int32 messagesPerSecond = 10;
    var $messagesPerSecond = message.messagesPerSecond;
    if ($messagesPerSecond !== undefined) {
        writeVarint32(bb, 80);
        writeVarint64(bb, intToLong($messagesPerSecond));
    }
    // optional float packetLossRate = 11;
    var $packetLossRate = message.packetLossRate;
    if ($packetLossRate !== undefined) {
        writeVarint32(bb, 93);
        writeFloat(bb, $packetLossRate);
    }
    // optional float clientFPS = 12;
    var $clientFPS = message.clientFPS;
    if ($clientFPS !== undefined) {
        writeVarint32(bb, 101);
        writeFloat(bb, $clientFPS);
    }
    // optional float inputLatencyMs = 13;
    var $inputLatencyMs = message.inputLatencyMs;
    if ($inputLatencyMs !== undefined) {
        writeVarint32(bb, 109);
        writeFloat(bb, $inputLatencyMs);
    }
    // optional float renderTimeMs = 14;
    var $renderTimeMs = message.renderTimeMs;
    if ($renderTimeMs !== undefined) {
        writeVarint32(bb, 117);
        writeFloat(bb, $renderTimeMs);
    }
    // optional int64 clientMemoryMB = 15;
    var $clientMemoryMB = message.clientMemoryMB;
    if ($clientMemoryMB !== undefined) {
        writeVarint32(bb, 120);
        writeVarint64(bb, $clientMemoryMB);
    }
    // optional int64 timestamp = 16;
    var $timestamp = message.timestamp;
    if ($timestamp !== undefined) {
        writeVarint32(bb, 128);
        writeVarint64(bb, $timestamp);
    }
}
function decodePerformanceMetrics(binary) {
    return _decodePerformanceMetrics(wrapByteBuffer(binary));
}
exports.decodePerformanceMetrics = decodePerformanceMetrics;
function _decodePerformanceMetrics(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional float serverCpuUsage = 1;
            case 1: {
                message.serverCpuUsage = readFloat(bb);
                break;
            }
            // optional int64 serverMemoryMB = 2;
            case 2: {
                message.serverMemoryMB = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 activeConnections = 3;
            case 3: {
                message.activeConnections = readVarint32(bb);
                break;
            }
            // optional float averageLatencyMs = 4;
            case 4: {
                message.averageLatencyMs = readFloat(bb);
                break;
            }
            // optional float currentFPS = 5;
            case 5: {
                message.currentFPS = readFloat(bb);
                break;
            }
            // optional int32 playersCount = 6;
            case 6: {
                message.playersCount = readVarint32(bb);
                break;
            }
            // optional int64 gameStateSize = 7;
            case 7: {
                message.gameStateSize = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional float compressionRatio = 8;
            case 8: {
                message.compressionRatio = readFloat(bb);
                break;
            }
            // optional float bandwidthUsageKbps = 9;
            case 9: {
                message.bandwidthUsageKbps = readFloat(bb);
                break;
            }
            // optional int32 messagesPerSecond = 10;
            case 10: {
                message.messagesPerSecond = readVarint32(bb);
                break;
            }
            // optional float packetLossRate = 11;
            case 11: {
                message.packetLossRate = readFloat(bb);
                break;
            }
            // optional float clientFPS = 12;
            case 12: {
                message.clientFPS = readFloat(bb);
                break;
            }
            // optional float inputLatencyMs = 13;
            case 13: {
                message.inputLatencyMs = readFloat(bb);
                break;
            }
            // optional float renderTimeMs = 14;
            case 14: {
                message.renderTimeMs = readFloat(bb);
                break;
            }
            // optional int64 clientMemoryMB = 15;
            case 15: {
                message.clientMemoryMB = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 timestamp = 16;
            case 16: {
                message.timestamp = readVarint64(bb, /* unsigned */ false);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeServerMessage(message) {
    var bb = popByteBuffer();
    _encodeServerMessage(message, bb);
    return toUint8Array(bb);
}
exports.encodeServerMessage = encodeServerMessage;
function _encodeServerMessage(message, bb) {
    // optional GameState game = 1;
    var $game = message.game;
    if ($game !== undefined) {
        writeVarint32(bb, 10);
        var nested = popByteBuffer();
        _encodeGameState($game, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional ScoreState score = 2;
    var $score = message.score;
    if ($score !== undefined) {
        writeVarint32(bb, 18);
        var nested = popByteBuffer();
        _encodeScoreState($score, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional QueueState queue = 3;
    var $queue = message.queue;
    if ($queue !== undefined) {
        writeVarint32(bb, 26);
        var nested = popByteBuffer();
        _encodeQueueState($queue, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional DeltaGameState deltaGame = 4;
    var $deltaGame = message.deltaGame;
    if ($deltaGame !== undefined) {
        writeVarint32(bb, 34);
        var nested = popByteBuffer();
        _encodeDeltaGameState($deltaGame, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional RollbackCorrection rollback = 5;
    var $rollback = message.rollback;
    if ($rollback !== undefined) {
        writeVarint32(bb, 42);
        var nested = popByteBuffer();
        _encodeRollbackCorrection($rollback, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional InputAcknowledgment inputAck = 6;
    var $inputAck = message.inputAck;
    if ($inputAck !== undefined) {
        writeVarint32(bb, 50);
        var nested = popByteBuffer();
        _encodeInputAcknowledgment($inputAck, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PerformanceMetrics metrics = 7;
    var $metrics = message.metrics;
    if ($metrics !== undefined) {
        writeVarint32(bb, 58);
        var nested = popByteBuffer();
        _encodePerformanceMetrics($metrics, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional string type = 10;
    var $type = message.type;
    if ($type !== undefined) {
        writeVarint32(bb, 82);
        writeString(bb, $type);
    }
    // optional int64 sequence = 11;
    var $sequence = message.sequence;
    if ($sequence !== undefined) {
        writeVarint32(bb, 88);
        writeVarint64(bb, $sequence);
    }
    // optional int64 timestamp = 12;
    var $timestamp = message.timestamp;
    if ($timestamp !== undefined) {
        writeVarint32(bb, 96);
        writeVarint64(bb, $timestamp);
    }
}
function decodeServerMessage(binary) {
    return _decodeServerMessage(wrapByteBuffer(binary));
}
exports.decodeServerMessage = decodeServerMessage;
function _decodeServerMessage(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional GameState game = 1;
            case 1: {
                var limit = pushTemporaryLength(bb);
                message.game = _decodeGameState(bb);
                bb.limit = limit;
                break;
            }
            // optional ScoreState score = 2;
            case 2: {
                var limit = pushTemporaryLength(bb);
                message.score = _decodeScoreState(bb);
                bb.limit = limit;
                break;
            }
            // optional QueueState queue = 3;
            case 3: {
                var limit = pushTemporaryLength(bb);
                message.queue = _decodeQueueState(bb);
                bb.limit = limit;
                break;
            }
            // optional DeltaGameState deltaGame = 4;
            case 4: {
                var limit = pushTemporaryLength(bb);
                message.deltaGame = _decodeDeltaGameState(bb);
                bb.limit = limit;
                break;
            }
            // optional RollbackCorrection rollback = 5;
            case 5: {
                var limit = pushTemporaryLength(bb);
                message.rollback = _decodeRollbackCorrection(bb);
                bb.limit = limit;
                break;
            }
            // optional InputAcknowledgment inputAck = 6;
            case 6: {
                var limit = pushTemporaryLength(bb);
                message.inputAck = _decodeInputAcknowledgment(bb);
                bb.limit = limit;
                break;
            }
            // optional PerformanceMetrics metrics = 7;
            case 7: {
                var limit = pushTemporaryLength(bb);
                message.metrics = _decodePerformanceMetrics(bb);
                bb.limit = limit;
                break;
            }
            // optional string type = 10;
            case 10: {
                message.type = readString(bb, readVarint32(bb));
                break;
            }
            // optional int64 sequence = 11;
            case 11: {
                message.sequence = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 timestamp = 12;
            case 12: {
                message.timestamp = readVarint64(bb, /* unsigned */ false);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function encodeClientMessage(message) {
    var bb = popByteBuffer();
    _encodeClientMessage(message, bb);
    return toUint8Array(bb);
}
exports.encodeClientMessage = encodeClientMessage;
function _encodeClientMessage(message, bb) {
    // optional PredictiveInput input = 1;
    var $input = message.input;
    if ($input !== undefined) {
        writeVarint32(bb, 10);
        var nested = popByteBuffer();
        _encodePredictiveInput($input, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PerformanceMetrics clientMetrics = 2;
    var $clientMetrics = message.clientMetrics;
    if ($clientMetrics !== undefined) {
        writeVarint32(bb, 18);
        var nested = popByteBuffer();
        _encodePerformanceMetrics($clientMetrics, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional string type = 10;
    var $type = message.type;
    if ($type !== undefined) {
        writeVarint32(bb, 82);
        writeString(bb, $type);
    }
    // optional int64 sequence = 11;
    var $sequence = message.sequence;
    if ($sequence !== undefined) {
        writeVarint32(bb, 88);
        writeVarint64(bb, $sequence);
    }
    // optional int64 timestamp = 12;
    var $timestamp = message.timestamp;
    if ($timestamp !== undefined) {
        writeVarint32(bb, 96);
        writeVarint64(bb, $timestamp);
    }
}
function decodeClientMessage(binary) {
    return _decodeClientMessage(wrapByteBuffer(binary));
}
exports.decodeClientMessage = decodeClientMessage;
function _decodeClientMessage(bb) {
    var message = {};
    end_of_message: while (!isAtEnd(bb)) {
        var tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional PredictiveInput input = 1;
            case 1: {
                var limit = pushTemporaryLength(bb);
                message.input = _decodePredictiveInput(bb);
                bb.limit = limit;
                break;
            }
            // optional PerformanceMetrics clientMetrics = 2;
            case 2: {
                var limit = pushTemporaryLength(bb);
                message.clientMetrics = _decodePerformanceMetrics(bb);
                bb.limit = limit;
                break;
            }
            // optional string type = 10;
            case 10: {
                message.type = readString(bb, readVarint32(bb));
                break;
            }
            // optional int64 sequence = 11;
            case 11: {
                message.sequence = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 timestamp = 12;
            case 12: {
                message.timestamp = readVarint64(bb, /* unsigned */ false);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function pushTemporaryLength(bb) {
    var length = readVarint32(bb);
    var limit = bb.limit;
    bb.limit = bb.offset + length;
    return limit;
}
function skipUnknownField(bb, type) {
    switch (type) {
        case 0:
            while (readByte(bb) & 0x80) { }
            break;
        case 2:
            skip(bb, readVarint32(bb));
            break;
        case 5:
            skip(bb, 4);
            break;
        case 1:
            skip(bb, 8);
            break;
        default: throw new Error("Unimplemented type: " + type);
    }
}
function stringToLong(value) {
    return {
        low: value.charCodeAt(0) | (value.charCodeAt(1) << 16),
        high: value.charCodeAt(2) | (value.charCodeAt(3) << 16),
        unsigned: false,
    };
}
function longToString(value) {
    var low = value.low;
    var high = value.high;
    return String.fromCharCode(low & 0xFFFF, low >>> 16, high & 0xFFFF, high >>> 16);
}
// The code below was modified from https://github.com/protobufjs/bytebuffer.js
// which is under the Apache License 2.0.
var f32 = new Float32Array(1);
var f32_u8 = new Uint8Array(f32.buffer);
var f64 = new Float64Array(1);
var f64_u8 = new Uint8Array(f64.buffer);
function intToLong(value) {
    value |= 0;
    return {
        low: value,
        high: value >> 31,
        unsigned: value >= 0,
    };
}
var bbStack = [];
function popByteBuffer() {
    var bb = bbStack.pop();
    if (!bb)
        return { bytes: new Uint8Array(64), offset: 0, limit: 0 };
    bb.offset = bb.limit = 0;
    return bb;
}
function pushByteBuffer(bb) {
    bbStack.push(bb);
}
function wrapByteBuffer(bytes) {
    return { bytes: bytes, offset: 0, limit: bytes.length };
}
function toUint8Array(bb) {
    var bytes = bb.bytes;
    var limit = bb.limit;
    return bytes.length === limit ? bytes : bytes.subarray(0, limit);
}
function skip(bb, offset) {
    if (bb.offset + offset > bb.limit) {
        throw new Error('Skip past limit');
    }
    bb.offset += offset;
}
function isAtEnd(bb) {
    return bb.offset >= bb.limit;
}
function grow(bb, count) {
    var bytes = bb.bytes;
    var offset = bb.offset;
    var limit = bb.limit;
    var finalOffset = offset + count;
    if (finalOffset > bytes.length) {
        var newBytes = new Uint8Array(finalOffset * 2);
        newBytes.set(bytes);
        bb.bytes = newBytes;
    }
    bb.offset = finalOffset;
    if (finalOffset > limit) {
        bb.limit = finalOffset;
    }
    return offset;
}
function advance(bb, count) {
    var offset = bb.offset;
    if (offset + count > bb.limit) {
        throw new Error('Read past limit');
    }
    bb.offset += count;
    return offset;
}
function readBytes(bb, count) {
    var offset = advance(bb, count);
    return bb.bytes.subarray(offset, offset + count);
}
function writeBytes(bb, buffer) {
    var offset = grow(bb, buffer.length);
    bb.bytes.set(buffer, offset);
}
function readString(bb, count) {
    // Sadly a hand-coded UTF8 decoder is much faster than subarray+TextDecoder in V8
    var offset = advance(bb, count);
    var fromCharCode = String.fromCharCode;
    var bytes = bb.bytes;
    var invalid = '\uFFFD';
    var text = '';
    for (var i = 0; i < count; i++) {
        var c1 = bytes[i + offset], c2 = void 0, c3 = void 0, c4 = void 0, c = void 0;
        // 1 byte
        if ((c1 & 0x80) === 0) {
            text += fromCharCode(c1);
        }
        // 2 bytes
        else if ((c1 & 0xE0) === 0xC0) {
            if (i + 1 >= count)
                text += invalid;
            else {
                c2 = bytes[i + offset + 1];
                if ((c2 & 0xC0) !== 0x80)
                    text += invalid;
                else {
                    c = ((c1 & 0x1F) << 6) | (c2 & 0x3F);
                    if (c < 0x80)
                        text += invalid;
                    else {
                        text += fromCharCode(c);
                        i++;
                    }
                }
            }
        }
        // 3 bytes
        else if ((c1 & 0xF0) == 0xE0) {
            if (i + 2 >= count)
                text += invalid;
            else {
                c2 = bytes[i + offset + 1];
                c3 = bytes[i + offset + 2];
                if (((c2 | (c3 << 8)) & 0xC0C0) !== 0x8080)
                    text += invalid;
                else {
                    c = ((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F);
                    if (c < 0x0800 || (c >= 0xD800 && c <= 0xDFFF))
                        text += invalid;
                    else {
                        text += fromCharCode(c);
                        i += 2;
                    }
                }
            }
        }
        // 4 bytes
        else if ((c1 & 0xF8) == 0xF0) {
            if (i + 3 >= count)
                text += invalid;
            else {
                c2 = bytes[i + offset + 1];
                c3 = bytes[i + offset + 2];
                c4 = bytes[i + offset + 3];
                if (((c2 | (c3 << 8) | (c4 << 16)) & 0xC0C0C0) !== 0x808080)
                    text += invalid;
                else {
                    c = ((c1 & 0x07) << 0x12) | ((c2 & 0x3F) << 0x0C) | ((c3 & 0x3F) << 0x06) | (c4 & 0x3F);
                    if (c < 0x10000 || c > 0x10FFFF)
                        text += invalid;
                    else {
                        c -= 0x10000;
                        text += fromCharCode((c >> 10) + 0xD800, (c & 0x3FF) + 0xDC00);
                        i += 3;
                    }
                }
            }
        }
        else
            text += invalid;
    }
    return text;
}
function writeString(bb, text) {
    // Sadly a hand-coded UTF8 encoder is much faster than TextEncoder+set in V8
    var n = text.length;
    var byteCount = 0;
    // Write the byte count first
    for (var i = 0; i < n; i++) {
        var c = text.charCodeAt(i);
        if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n) {
            c = (c << 10) + text.charCodeAt(++i) - 0x35FDC00;
        }
        byteCount += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }
    writeVarint32(bb, byteCount);
    var offset = grow(bb, byteCount);
    var bytes = bb.bytes;
    // Then write the bytes
    for (var i = 0; i < n; i++) {
        var c = text.charCodeAt(i);
        if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n) {
            c = (c << 10) + text.charCodeAt(++i) - 0x35FDC00;
        }
        if (c < 0x80) {
            bytes[offset++] = c;
        }
        else {
            if (c < 0x800) {
                bytes[offset++] = ((c >> 6) & 0x1F) | 0xC0;
            }
            else {
                if (c < 0x10000) {
                    bytes[offset++] = ((c >> 12) & 0x0F) | 0xE0;
                }
                else {
                    bytes[offset++] = ((c >> 18) & 0x07) | 0xF0;
                    bytes[offset++] = ((c >> 12) & 0x3F) | 0x80;
                }
                bytes[offset++] = ((c >> 6) & 0x3F) | 0x80;
            }
            bytes[offset++] = (c & 0x3F) | 0x80;
        }
    }
}
function writeByteBuffer(bb, buffer) {
    var offset = grow(bb, buffer.limit);
    var from = bb.bytes;
    var to = buffer.bytes;
    // This for loop is much faster than subarray+set on V8
    for (var i = 0, n = buffer.limit; i < n; i++) {
        from[i + offset] = to[i];
    }
}
function readByte(bb) {
    return bb.bytes[advance(bb, 1)];
}
function writeByte(bb, value) {
    var offset = grow(bb, 1);
    bb.bytes[offset] = value;
}
function readFloat(bb) {
    var offset = advance(bb, 4);
    var bytes = bb.bytes;
    // Manual copying is much faster than subarray+set in V8
    f32_u8[0] = bytes[offset++];
    f32_u8[1] = bytes[offset++];
    f32_u8[2] = bytes[offset++];
    f32_u8[3] = bytes[offset++];
    return f32[0];
}
function writeFloat(bb, value) {
    var offset = grow(bb, 4);
    var bytes = bb.bytes;
    f32[0] = value;
    // Manual copying is much faster than subarray+set in V8
    bytes[offset++] = f32_u8[0];
    bytes[offset++] = f32_u8[1];
    bytes[offset++] = f32_u8[2];
    bytes[offset++] = f32_u8[3];
}
function readDouble(bb) {
    var offset = advance(bb, 8);
    var bytes = bb.bytes;
    // Manual copying is much faster than subarray+set in V8
    f64_u8[0] = bytes[offset++];
    f64_u8[1] = bytes[offset++];
    f64_u8[2] = bytes[offset++];
    f64_u8[3] = bytes[offset++];
    f64_u8[4] = bytes[offset++];
    f64_u8[5] = bytes[offset++];
    f64_u8[6] = bytes[offset++];
    f64_u8[7] = bytes[offset++];
    return f64[0];
}
function writeDouble(bb, value) {
    var offset = grow(bb, 8);
    var bytes = bb.bytes;
    f64[0] = value;
    // Manual copying is much faster than subarray+set in V8
    bytes[offset++] = f64_u8[0];
    bytes[offset++] = f64_u8[1];
    bytes[offset++] = f64_u8[2];
    bytes[offset++] = f64_u8[3];
    bytes[offset++] = f64_u8[4];
    bytes[offset++] = f64_u8[5];
    bytes[offset++] = f64_u8[6];
    bytes[offset++] = f64_u8[7];
}
function readInt32(bb) {
    var offset = advance(bb, 4);
    var bytes = bb.bytes;
    return (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24));
}
function writeInt32(bb, value) {
    var offset = grow(bb, 4);
    var bytes = bb.bytes;
    bytes[offset] = value;
    bytes[offset + 1] = value >> 8;
    bytes[offset + 2] = value >> 16;
    bytes[offset + 3] = value >> 24;
}
function readInt64(bb, unsigned) {
    return {
        low: readInt32(bb),
        high: readInt32(bb),
        unsigned: unsigned,
    };
}
function writeInt64(bb, value) {
    writeInt32(bb, value.low);
    writeInt32(bb, value.high);
}
function readVarint32(bb) {
    var c = 0;
    var value = 0;
    var b;
    do {
        b = readByte(bb);
        if (c < 32)
            value |= (b & 0x7F) << c;
        c += 7;
    } while (b & 0x80);
    return value;
}
function writeVarint32(bb, value) {
    value >>>= 0;
    while (value >= 0x80) {
        writeByte(bb, (value & 0x7f) | 0x80);
        value >>>= 7;
    }
    writeByte(bb, value);
}
function readVarint64(bb, unsigned) {
    var part0 = 0;
    var part1 = 0;
    var part2 = 0;
    var b;
    b = readByte(bb);
    part0 = (b & 0x7F);
    if (b & 0x80) {
        b = readByte(bb);
        part0 |= (b & 0x7F) << 7;
        if (b & 0x80) {
            b = readByte(bb);
            part0 |= (b & 0x7F) << 14;
            if (b & 0x80) {
                b = readByte(bb);
                part0 |= (b & 0x7F) << 21;
                if (b & 0x80) {
                    b = readByte(bb);
                    part1 = (b & 0x7F);
                    if (b & 0x80) {
                        b = readByte(bb);
                        part1 |= (b & 0x7F) << 7;
                        if (b & 0x80) {
                            b = readByte(bb);
                            part1 |= (b & 0x7F) << 14;
                            if (b & 0x80) {
                                b = readByte(bb);
                                part1 |= (b & 0x7F) << 21;
                                if (b & 0x80) {
                                    b = readByte(bb);
                                    part2 = (b & 0x7F);
                                    if (b & 0x80) {
                                        b = readByte(bb);
                                        part2 |= (b & 0x7F) << 7;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return {
        low: part0 | (part1 << 28),
        high: (part1 >>> 4) | (part2 << 24),
        unsigned: unsigned,
    };
}
function writeVarint64(bb, value) {
    var part0 = value.low >>> 0;
    var part1 = ((value.low >>> 28) | (value.high << 4)) >>> 0;
    var part2 = value.high >>> 24;
    // ref: src/google/protobuf/io/coded_stream.cc
    var size = part2 === 0 ?
        part1 === 0 ?
            part0 < 1 << 14 ?
                part0 < 1 << 7 ? 1 : 2 :
                part0 < 1 << 21 ? 3 : 4 :
            part1 < 1 << 14 ?
                part1 < 1 << 7 ? 5 : 6 :
                part1 < 1 << 21 ? 7 : 8 :
        part2 < 1 << 7 ? 9 : 10;
    var offset = grow(bb, size);
    var bytes = bb.bytes;
    switch (size) {
        case 10: bytes[offset + 9] = (part2 >>> 7) & 0x01;
        case 9: bytes[offset + 8] = size !== 9 ? part2 | 0x80 : part2 & 0x7F;
        case 8: bytes[offset + 7] = size !== 8 ? (part1 >>> 21) | 0x80 : (part1 >>> 21) & 0x7F;
        case 7: bytes[offset + 6] = size !== 7 ? (part1 >>> 14) | 0x80 : (part1 >>> 14) & 0x7F;
        case 6: bytes[offset + 5] = size !== 6 ? (part1 >>> 7) | 0x80 : (part1 >>> 7) & 0x7F;
        case 5: bytes[offset + 4] = size !== 5 ? part1 | 0x80 : part1 & 0x7F;
        case 4: bytes[offset + 3] = size !== 4 ? (part0 >>> 21) | 0x80 : (part0 >>> 21) & 0x7F;
        case 3: bytes[offset + 2] = size !== 3 ? (part0 >>> 14) | 0x80 : (part0 >>> 14) & 0x7F;
        case 2: bytes[offset + 1] = size !== 2 ? (part0 >>> 7) | 0x80 : (part0 >>> 7) & 0x7F;
        case 1: bytes[offset] = size !== 1 ? part0 | 0x80 : part0 & 0x7F;
    }
}
function readVarint32ZigZag(bb) {
    var value = readVarint32(bb);
    // ref: src/google/protobuf/wire_format_lite.h
    return (value >>> 1) ^ -(value & 1);
}
function writeVarint32ZigZag(bb, value) {
    // ref: src/google/protobuf/wire_format_lite.h
    writeVarint32(bb, (value << 1) ^ (value >> 31));
}
function readVarint64ZigZag(bb) {
    var value = readVarint64(bb, /* unsigned */ false);
    var low = value.low;
    var high = value.high;
    var flip = -(low & 1);
    // ref: src/google/protobuf/wire_format_lite.h
    return {
        low: ((low >>> 1) | (high << 31)) ^ flip,
        high: (high >>> 1) ^ flip,
        unsigned: false,
    };
}
function writeVarint64ZigZag(bb, value) {
    var low = value.low;
    var high = value.high;
    var flip = high >> 31;
    // ref: src/google/protobuf/wire_format_lite.h
    writeVarint64(bb, {
        low: (low << 1) ^ flip,
        high: ((high << 1) | (low >>> 31)) ^ flip,
        unsigned: false,
    });
}
//# sourceMappingURL=messages_pb.js.map