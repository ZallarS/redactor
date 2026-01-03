class NPC {
    constructor(id, type, x, y) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.name = this.getNPCName(type);
        this.color = this.getNPCColor(type);
        this.behavior = 'idle';
        this.dialog = null;
        this.inventory = [];
        this.health = 100;
        this.maxHealth = 100;
    }

    getNPCName(type) {
        const names = {
            'cop': 'Офицер полиции',
            'gangster': 'Бандит',
            'civilian': 'Гражданин',
            'dealer': 'Торговец',
            'medic': 'Медик',
            'driver': 'Водитель'
        };
        return names[type] || 'Неизвестный';
    }

    getNPCColor(type) {
        const colors = {
            'cop': '#0000ff',
            'gangster': '#ff0000',
            'civilian': '#00ff00',
            'dealer': '#ffff00',
            'medic': '#ffffff',
            'driver': '#ff8800'
        };
        return colors[type] || '#888888';
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            behavior: this.behavior,
            dialog: this.dialog,
            health: this.health,
            maxHealth: this.maxHealth
        };
    }

    static fromJSON(data) {
        const npc = new NPC(data.id, data.type, data.x, data.y);
        npc.behavior = data.behavior || 'idle';
        npc.dialog = data.dialog || null;
        npc.health = data.health || 100;
        npc.maxHealth = data.maxHealth || 100;
        return npc;
    }
}

class Mission {
    constructor(id, name, description, type = 'trigger') {
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type;
        this.difficulty = 'normal';
        this.timeLimit = 0;
        this.status = 'available';
        this.prerequisites = [];
        this.nextMissions = [];

        this.startTrigger = null;
        this.targetTriggers = [];
        this.endTrigger = null;

        this.objectives = [];

        this.rewards = {
            experience: 100,
            money: 500,
            items: []
        };

        this.dialogs = [];

        this.mapTransition = {
            targetMap: null,
            spawnTriggerId: null,
            keepInventory: true
        };

        this.settings = {
            collection: {
                totalRequired: 0,
                currentCollected: 0
            },
            delivery: {
                itemId: null,
                destinationTriggerId: null,
                timeLimit: 0
            },
            elimination: {
                targetType: 'enemy',
                targetCount: 0,
                currentCount: 0
            },
            escort: {
                npcId: null,
                destinationTriggerId: null,
                health: 100,
                maxHealth: 100
            }
        };

        this.created = Date.now();
        this.updated = Date.now();
    }

    addObjective(type, data) {
        const objective = {
            id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            description: '',
            completed: false,
            data: data || {}
        };

        this.objectives.push(objective);
        return objective;
    }

    addDialog(character, text, options = []) {
        const dialog = {
            id: `dialog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            character: character,
            text: text,
            image: null,
            options: options,
            trigger: null,
            nextDialog: null
        };

        this.dialogs.push(dialog);
        return dialog;
    }

    addTargetTrigger(triggerId, requiredCount = 1) {
        this.targetTriggers.push({
            triggerId: triggerId,
            requiredCount: requiredCount,
            collectedCount: 0
        });
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            type: this.type,
            difficulty: this.difficulty,
            timeLimit: this.timeLimit,
            status: this.status,
            startTrigger: this.startTrigger,
            targetTriggers: this.targetTriggers,
            endTrigger: this.endTrigger,
            objectives: this.objectives,
            rewards: this.rewards,
            dialogs: this.dialogs,
            mapTransition: this.mapTransition,
            settings: this.settings,
            prerequisites: this.prerequisites,
            nextMissions: this.nextMissions,
            created: this.created,
            updated: Date.now()
        };
    }

    static fromJSON(data) {
        const mission = new Mission(data.id, data.name, data.description, data.type);
        Object.assign(mission, data);
        mission.updated = Date.now();
        return mission;
    }
}

class MissionManager {
    constructor() {
        this.missions = [];
        this.nextMissionId = 1;
        this.activeMission = null;
        this.completedMissions = [];

        this.items = {
            weapon_pistol: { name: 'Пистолет', type: 'weapon', value: 25 },
            weapon_shotgun: { name: 'Дробовик', type: 'weapon', value: 50 },
            weapon_rifle: { name: 'Винтовка', type: 'weapon', value: 75 },
            ammo_pistol: { name: 'Патроны для пистолета', type: 'ammo', value: 12 },
            ammo_shotgun: { name: 'Патроны для дробовика', type: 'ammo', value: 8 },
            ammo_rifle: { name: 'Патроны для винтовки', type: 'ammo', value: 30 },
            health_pack: { name: 'Аптечка', type: 'health', value: 50 },
            armor_vest: { name: 'Бронежилет', type: 'armor', value: 100 },
            money_small: { name: 'Маленькая сумка денег', type: 'money', value: 1000 },
            money_medium: { name: 'Средняя сумка денег', type: 'money', value: 5000 },
            money_large: { name: 'Большая сумка денег', type: 'money', value: 25000 },
            key_house: { name: 'Ключ от дома', type: 'key', value: 1 },
            document_secret: { name: 'Секретный документ', type: 'document', value: 0 }
        };

        this.npcs = {
            cop: { name: 'Офицер полиции', type: 'cop' },
            gangster: { name: 'Бандит', type: 'gangster' },
            civilian: { name: 'Гражданин', type: 'civilian' },
            dealer: { name: 'Торговец', type: 'dealer' },
            medic: { name: 'Медик', type: 'medic' },
            driver: { name: 'Водитель', type: 'driver' }
        };
    }

    addMission(mission) {
        this.missions.push(mission);
        return mission;
    }

    getMission(id) {
        return this.missions.find(m => m.id === id);
    }

    getMissionsByTrigger(triggerId) {
        return this.missions.filter(m =>
            m.startTrigger === triggerId ||
            m.endTrigger === triggerId ||
            m.targetTriggers.some(t => t.triggerId === triggerId)
        );
    }

    removeMission(id) {
        this.missions = this.missions.filter(m => m.id !== id);
    }

    getNextMissionId() {
        while (this.missions.some(m => m.id === this.nextMissionId)) {
            this.nextMissionId++;
        }
        return this.nextMissionId++;
    }

    getAvailableMissions() {
        return this.missions.filter(m =>
            m.status === 'available' &&
            (m.prerequisites.length === 0 ||
                m.prerequisites.every(p => this.completedMissions.includes(p)))
        );
    }

    startMission(id) {
        const mission = this.getMission(id);
        if (mission && mission.status === 'available') {
            mission.status = 'active';
            this.activeMission = mission;

            mission.targetTriggers.forEach(t => t.collectedCount = 0);
            mission.objectives.forEach(o => o.completed = false);

            return mission;
        }
        return null;
    }

    completeObjective(missionId, objectiveId) {
        const mission = this.getMission(missionId);
        if (mission && mission.status === 'active') {
            const objective = mission.objectives.find(o => o.id === objectiveId);
            if (objective && !objective.completed) {
                objective.completed = true;
                return true;
            }
        }
        return false;
    }

    collectTrigger(triggerId) {
        const mission = this.activeMission;
        if (mission && mission.status === 'active') {
            const target = mission.targetTriggers.find(t => t.triggerId === triggerId);
            if (target && target.collectedCount < target.requiredCount) {
                target.collectedCount++;

                if (this.checkMissionCompletion(mission)) {
                    this.completeMission(mission.id);
                }

                return true;
            }
        }
        return false;
    }

    checkMissionCompletion(mission) {
        const allTriggersCollected = mission.targetTriggers.every(
            t => t.collectedCount >= t.requiredCount
        );

        const allObjectivesCompleted = mission.objectives.every(o => o.completed);

        return allTriggersCollected && allObjectivesCompleted;
    }

    completeMission(id) {
        const mission = this.getMission(id);
        if (mission && mission.status === 'active') {
            mission.status = 'completed';
            this.completedMissions.push(id);
            this.activeMission = null;

            return mission.rewards;
        }
        return null;
    }

    failMission(id, reason = 'timeout') {
        const mission = this.getMission(id);
        if (mission && mission.status === 'active') {
            mission.status = 'failed';
            mission.failReason = reason;
            this.activeMission = null;
            return true;
        }
        return false;
    }

    toJSON() {
        return {
            missions: this.missions.map(m => m.toJSON()),
            completedMissions: this.completedMissions,
            nextMissionId: this.nextMissionId,
            items: this.items,
            npcs: this.npcs
        };
    }

    static fromJSON(data) {
        const manager = new MissionManager();
        manager.missions = data.missions.map(m => Mission.fromJSON(m));
        manager.completedMissions = data.completedMissions || [];
        manager.nextMissionId = data.nextMissionId || manager.nextMissionId;
        manager.items = data.items || manager.items;
        manager.npcs = data.npcs || manager.npcs;
        return manager;
    }
}

class MapEditor {
    constructor() {
        this.tileSize = 32;
        this.mapWidth = 50;
        this.mapHeight = 50;

        this.currentTile = 2;
        this.currentTransport = null;
        this.currentTrigger = null;
        this.currentStructure = null;
        this.currentNpc = null;

        this.mapData = [];
        this.transportData = [];
        this.npcs = [];
        this.selection = {
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            active: false
        };

        this.isDrawing = false;
        this.tool = 'brush';
        this.transportDirection = 0;

        this.showPreview = true;
        this.previewOpacity = 0.6;

        this.previewState = {
            type: null,
            id: null,
            x: null,
            y: null,
            direction: 0,
            needsUpdate: false
        };

        this.missionManager = new MissionManager();
        this.currentMission = null;
        this.editingMissionId = null;
        this.editingDialog = null;
        this.editingItem = null;

        this.animationFrameId = null;

        this.npcTypes = {
            300: { name: 'Полицейский', type: 'cop', color: '#0000ff' },
            301: { name: 'Бандит', type: 'gangster', color: '#ff0000' },
            302: { name: 'Гражданин', type: 'civilian', color: '#00ff00' },
            303: { name: 'Торговец', type: 'dealer', color: '#ffff00' },
            304: { name: 'Медик', type: 'medic', color: '#ffffff' },
            305: { name: 'Водитель', type: 'driver', color: '#ff8800' }
        };

        this.init();
    }

    async init() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.selectionCanvas = document.getElementById('selectionCanvas');
        this.selectionCtx = this.selectionCanvas.getContext('2d');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.gridCtx = this.gridCanvas.getContext('2d');

        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.id = 'previewCanvas';
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCanvas.width = this.canvas.width;
        this.previewCanvas.height = this.canvas.height;
        document.querySelector('.canvas-container').appendChild(this.previewCanvas);

        this.coordinatesDisplay = document.getElementById('coordinates');
        this.toolInfoDisplay = document.getElementById('toolInfo');
        this.selectionInfoDisplay = document.getElementById('selectionInfo');
        this.objectInfoDisplay = document.getElementById('objectInfo');
        this.missionInfoDisplay = document.getElementById('missionInfo');
        this.editMissionBtn = document.getElementById('editMissionBtn');

        this.missionEditorModal = document.getElementById('missionEditorModal');
        this.dialogEditorModal = document.getElementById('dialogEditorModal');
        this.itemEditorModal = document.getElementById('itemEditorModal');

        this.createTiles();
        this.createTransports();
        this.createTriggers();
        this.createStructures();
        this.initializeMap();
        this.setupEvents();
        this.render();

        this.createTilePalette();
        this.createTransportPalette();
        this.createTriggersPalette();
        this.createStructuresPalette();
        this.createNpcPalette();

        this.initMissionEditor();

        this.updateToolInfo();

        this.animationLoop();
    }

    animationLoop() {
        if (this.previewState.needsUpdate && this.showPreview) {
            this.drawPreview();
            this.previewState.needsUpdate = false;
        }

        this.animationFrameId = requestAnimationFrame(() => this.animationLoop());
    }

    drawPreview() {
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

        const { type, id, x, y, direction } = this.previewState;

        if (!type || x === null || y === null) return;

        if (type === 'structure') {
            this.drawStructurePreview();
        } else if (type === 'npc') {
            this.drawNpcPreview(x, y);
        } else {
            this.drawSinglePreview(x, y);
        }
    }

    drawSinglePreview(x, y) {
        const { type, id, direction } = this.previewState;
        let pattern = null;
        let fits = true;

        switch(type) {
            case 'tile':
                if (this.tiles[id]) {
                    pattern = this.tiles[id].pattern;
                }
                break;

            case 'transport':
                if (this.transports[id]) {
                    pattern = this.transports[id].patterns[direction || 0];
                }
                break;

            case 'trigger':
                if (this.triggers[id]) {
                    pattern = this.triggers[id].pattern;
                }
                break;
        }

        if (!pattern) return;

        this.previewCtx.globalAlpha = this.previewOpacity;

        this.previewCtx.drawImage(
            pattern,
            x * this.tileSize,
            y * this.tileSize,
            this.tileSize,
            this.tileSize
        );

        this.previewCtx.globalAlpha = 1.0;

        const strokeColor = fits ? '#00ff00' : '#ff0000';
        this.previewCtx.strokeStyle = strokeColor;
        this.previewCtx.lineWidth = 2;
        this.previewCtx.setLineDash([3, 3]);
        this.previewCtx.strokeRect(
            x * this.tileSize,
            y * this.tileSize,
            this.tileSize,
            this.tileSize
        );
        this.previewCtx.setLineDash([]);
    }

    drawStructurePreview() {
        const { id, x, y } = this.previewState;
        const structure = this.structures[id];

        if (!structure) return;

        const fits = (x + structure.width <= this.mapWidth && y + structure.height <= this.mapHeight);

        this.previewCtx.globalAlpha = this.previewOpacity;

        if (fits) {
            for (let sy = 0; sy < structure.height; sy++) {
                for (let sx = 0; sx < structure.width; sx++) {
                    const tileId = structure.data[sy][sx];
                    if (tileId !== 0) {
                        const targetX = x + sx;
                        const targetY = y + sy;

                        let tile;
                        if (tileId >= 100) {
                            tile = this.triggers[tileId];
                        } else if (tileId >= 200) {
                            tile = this.transports[tileId];
                        } else {
                            tile = this.tiles[tileId];
                        }

                        if (tile && (tile.pattern || tile.patterns)) {
                            let pattern;
                            if (tile.patterns) {
                                pattern = tile.patterns[0];
                            } else {
                                pattern = tile.pattern;
                            }

                            if (pattern) {
                                this.previewCtx.drawImage(
                                    pattern,
                                    targetX * this.tileSize,
                                    targetY * this.tileSize,
                                    this.tileSize,
                                    this.tileSize
                                );
                            }
                        }
                    }
                }
            }
        }

        this.previewCtx.globalAlpha = 1.0;

        const strokeColor = fits ? '#00ff00' : '#ff0000';
        this.previewCtx.strokeStyle = strokeColor;
        this.previewCtx.lineWidth = 2;
        this.previewCtx.setLineDash([5, 3]);
        this.previewCtx.strokeRect(
            x * this.tileSize,
            y * this.tileSize,
            structure.width * this.tileSize,
            structure.height * this.tileSize
        );
        this.previewCtx.setLineDash([]);
    }

    drawNpcPreview(x, y) {
        const { id } = this.previewState;
        const npcType = this.npcTypes[id];

        if (!npcType) return;

        this.previewCtx.globalAlpha = this.previewOpacity;

        // Рисуем NPC
        this.previewCtx.fillStyle = npcType.color;
        this.previewCtx.beginPath();
        this.previewCtx.arc(
            x * this.tileSize + this.tileSize / 2,
            y * this.tileSize + this.tileSize / 2,
            this.tileSize / 2 - 4,
            0,
            Math.PI * 2
        );
        this.previewCtx.fill();

        this.previewCtx.strokeStyle = '#ffffff';
        this.previewCtx.lineWidth = 2;
        this.previewCtx.stroke();

        this.previewCtx.fillStyle = '#ffffff';
        this.previewCtx.font = 'bold 12px Arial';
        this.previewCtx.textAlign = 'center';
        this.previewCtx.textBaseline = 'middle';
        this.previewCtx.fillText(npcType.type.charAt(0).toUpperCase(),
            x * this.tileSize + this.tileSize / 2,
            y * this.tileSize + this.tileSize / 2);

        this.previewCtx.globalAlpha = 1.0;

        const strokeColor = '#00ff00';
        this.previewCtx.strokeStyle = strokeColor;
        this.previewCtx.lineWidth = 2;
        this.previewCtx.setLineDash([3, 3]);
        this.previewCtx.strokeRect(
            x * this.tileSize,
            y * this.tileSize,
            this.tileSize,
            this.tileSize
        );
        this.previewCtx.setLineDash([]);
    }

    updatePreview(x, y) {
        if (!this.showPreview) {
            this.clearPreview();
            return;
        }

        let type = null;
        let id = null;
        let direction = this.transportDirection;

        if (this.tool === 'brush') {
            if (this.currentTile !== null) {
                type = 'tile';
                id = this.currentTile;
            } else if (this.currentTrigger !== null) {
                type = 'trigger';
                id = this.currentTrigger;
            }
        } else if (this.tool === 'transport' && this.currentTransport !== null) {
            type = 'transport';
            id = this.currentTransport;
            direction = this.transportDirection;
        } else if (this.tool === 'structure' && this.currentStructure !== null) {
            type = 'structure';
            id = this.currentStructure;
        } else if (this.tool === 'npc' && this.currentNpc !== null) {
            type = 'npc';
            id = this.currentNpc;
        }

        if (!type) {
            this.clearPreview();
            return;
        }

        if (this.previewState.type !== type ||
            this.previewState.id !== id ||
            this.previewState.x !== x ||
            this.previewState.y !== y ||
            this.previewState.direction !== direction) {

            this.previewState = {
                type,
                id,
                x,
                y,
                direction,
                needsUpdate: true
            };
        }
    }

    clearPreview() {
        if (this.previewState.type !== null) {
            this.previewState = {
                type: null,
                id: null,
                x: null,
                y: null,
                direction: 0,
                needsUpdate: true
            };
        }
    }

    createTiles() {
        this.tiles = {
            0: { name: 'Пустота', color: '#2a2a2a' },
            1: { name: 'Асфальт', color: '#333333' },
            2: { name: 'Трава', color: '#2d5a27' },
            3: { name: 'Тротуар', color: '#888888' },
            4: { name: 'Стена', color: '#555555' },
            5: { name: 'Крыша', color: '#444444' },
            6: { name: 'Дерево', color: '#1e3a1e' },
            7: { name: 'Вода', color: '#1a5a8a' },
            8: { name: 'Разметка', color: '#ffff00' },
            9: { name: 'Песок', color: '#c2b280' },
            10: { name: 'Грязь', color: '#8b6b42' },
            11: { name: 'Стекло', color: '#88ccff' },
            12: { name: 'Земля', color: '#8b7355' },
            13: { name: 'Решетка', color: '#666666' }
        };

        this.createTilePatterns();
    }

    createTransports() {
        this.transports = {
            200: {
                name: 'Спортивная машина',
                color: '#ff0000',
                size: { width: 1.5, height: 2.5 },
                type: 'car'
            },
            201: {
                name: 'Полицейская машина',
                color: '#0000ff',
                size: { width: 1.5, height: 2.5 },
                type: 'car'
            },
            202: {
                name: 'Грузовик',
                color: '#8b4513',
                size: { width: 2, height: 3 },
                type: 'truck'
            },
            203: {
                name: 'Автобус',
                color: '#ffff00',
                size: { width: 2, height: 4 },
                type: 'bus'
            },
            204: {
                name: 'Мотоцикл',
                color: '#ff69b4',
                size: { width: 0.8, height: 1.5 },
                type: 'bike'
            },
            205: {
                name: 'Такси',
                color: '#ffff00',
                size: { width: 1.5, height: 2.5 },
                type: 'car'
            },
            206: {
                name: 'Скорая помощь',
                color: '#ffffff',
                size: { width: 1.5, height: 2.5 },
                type: 'car'
            },
            207: {
                name: 'Пожарная машина',
                color: '#ff4500',
                size: { width: 1.8, height: 3.5 },
                type: 'truck'
            },
            208: {
                name: 'Гоночная машина',
                color: '#00ff00',
                size: { width: 1.3, height: 2.3 },
                type: 'car'
            },
            209: {
                name: 'Лимузин',
                color: '#000000',
                size: { width: 1.8, height: 3.5 },
                type: 'car'
            },
            210: {
                name: 'Вертолет',
                color: '#808080',
                size: { width: 2, height: 2 },
                type: 'helicopter'
            }
        };

        this.createTransportPatterns();
    }

    createTriggers() {
        this.triggers = {
            100: { name: 'Спавн игрока', color: '#ff0000', symbol: 'P', type: 'spawn' },
            101: { name: 'Спавн полиции', color: '#0000ff', symbol: 'C', type: 'spawn' },
            102: { name: 'Спавн авто', color: '#00ff00', symbol: 'A', type: 'spawn' },
            103: { name: 'Сохранение', color: '#ffff00', symbol: 'S', type: 'save' },
            104: { name: 'Магазин', color: '#ff00ff', symbol: 'M', type: 'shop' },
            105: { name: 'Миссия', color: '#00ffff', symbol: 'Q', type: 'mission' },
            106: { name: 'Триггер события', color: '#ff8800', symbol: 'E', type: 'event' },
            107: { name: 'Телепорт', color: '#8800ff', symbol: 'T', type: 'teleport' },
            108: { name: 'Чекпоинт', color: '#0088ff', symbol: 'C', type: 'checkpoint' },
            109: { name: 'Парковка', color: '#88ff00', symbol: 'P', type: 'parking' },

            110: { name: 'Старт миссии', color: '#00ff00', symbol: '🚩', type: 'mission_start' },
            111: { name: 'Финиш миссии', color: '#ff0000', symbol: '🏁', type: 'mission_end' },
            112: { name: 'Сбор предмета', color: '#ffff00', symbol: '📦', type: 'collect' },
            113: { name: 'Диалог с NPC', color: '#00ffff', symbol: '💬', type: 'dialog' },
            114: { name: 'Переход на карту', color: '#ff00ff', symbol: '🚪', type: 'map_transition' },
            115: { name: 'Активация объекта', color: '#ff8800', symbol: '🔧', type: 'activate' },
            116: { name: 'Уничтожение цели', color: '#ff0000', symbol: '🎯', type: 'destroy' },
            117: { name: 'Защита точки', color: '#0000ff', symbol: '🛡️', type: 'defend' },
            118: { name: 'Побег', color: '#ff8800', symbol: '🏃', type: 'escape' },
            119: { name: 'Точка ожидания', color: '#888888', symbol: '⏳', type: 'wait' },
            120: { name: 'Точка эскорта', color: '#00ff00', symbol: '👥', type: 'escort' }
        };

        this.createTriggerPatterns();
    }

    createStructures() {
        const smallHouse = [[4,4,4],[4,0,4],[5,5,5]];
        const bigHouse = [[4,4,4,4,4],[4,0,0,0,4],[4,0,0,0,4],[4,0,0,0,4],[5,5,5,5,5]];
        const crossroads = [[1,8,1,8,1],[8,8,8,8,8],[1,8,1,8,1],[8,8,8,8,8],[1,8,1,8,1]];
        const parking = [[1,1,1,1,1,1],[1,0,0,0,0,1],[1,8,8,8,8,1],[1,1,1,1,1,1]];
        const skyscraper = [[4,4,4],[4,0,4],[4,0,4],[4,0,4],[4,0,4],[4,0,4],[4,0,4],[5,5,5]];
        const fountain = [[3,3,3,3,3],[3,7,7,7,3],[3,7,7,7,3],[3,7,7,7,3],[3,3,3,3,3]];
        const gasStation = [[4,4,4],[4,13,4],[4,13,4],[3,3,3]];
        const shop = [[4,4,4,4],[4,11,11,4],[4,11,11,4],[5,5,5,5]];

        this.structures = {
            1: { name: 'Маленький дом', data: smallHouse, width: 3, height: 3 },
            2: { name: 'Большой дом', data: bigHouse, width: 5, height: 5 },
            3: { name: 'Перекресток', data: crossroads, width: 5, height: 5 },
            4: { name: 'Парковка', data: parking, width: 6, height: 4 },
            5: { name: 'Небоскреб', data: skyscraper, width: 3, height: 8 },
            6: { name: 'Фонтан', data: fountain, width: 5, height: 5 },
            7: { name: 'Бензоколонка', data: gasStation, width: 3, height: 4 },
            8: { name: 'Магазин', data: shop, width: 4, height: 4 }
        };

        this.createStructurePreviews();
    }

    createTilePatterns() {
        for (const id in this.tiles) {
            const tile = this.tiles[id];
            tile.pattern = this.createPatternForTile(id, tile.color);
        }
    }

    createTransportPatterns() {
        for (const id in this.transports) {
            const transport = this.transports[id];
            transport.patterns = {};

            for (let dir = 0; dir < 4; dir++) {
                transport.patterns[dir] = this.createTransportPattern(id, transport, dir);
            }
        }
    }

    createTriggerPatterns() {
        for (const id in this.triggers) {
            const trigger = this.triggers[id];
            const canvas = document.createElement('canvas');
            canvas.width = this.tileSize;
            canvas.height = this.tileSize;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = trigger.color;
            ctx.fillRect(0, 0, this.tileSize, this.tileSize);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(5, 5);
            ctx.lineTo(this.tileSize - 5, this.tileSize - 5);
            ctx.moveTo(this.tileSize - 5, 5);
            ctx.lineTo(5, this.tileSize - 5);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(trigger.symbol, this.tileSize / 2, this.tileSize / 2);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(4, 4, this.tileSize - 8, this.tileSize - 8);
            ctx.setLineDash([]);

            trigger.pattern = canvas;
        }
    }

    createStructurePreviews() {
        for (const id in this.structures) {
            const structure = this.structures[id];
            const canvas = document.createElement('canvas');
            const previewSize = 60;
            const scale = Math.min(
                previewSize / (structure.width * 8),
                previewSize / (structure.height * 8)
            );

            canvas.width = previewSize;
            canvas.height = previewSize;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#1a1a2a';
            ctx.fillRect(0, 0, previewSize, previewSize);

            const offsetX = (previewSize - structure.width * 8 * scale) / 2;
            const offsetY = (previewSize - structure.height * 8 * scale) / 2;

            for (let y = 0; y < structure.height; y++) {
                for (let x = 0; x < structure.width; x++) {
                    const tileId = structure.data[y][x];
                    if (tileId !== 0 && this.tiles[tileId]) {
                        ctx.fillStyle = this.tiles[tileId].color;
                        ctx.fillRect(
                            offsetX + x * 8 * scale,
                            offsetY + y * 8 * scale,
                            8 * scale,
                            8 * scale
                        );

                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(
                            offsetX + x * 8 * scale,
                            offsetY + y * 8 * scale,
                            8 * scale,
                            8 * scale
                        );
                    }
                }
            }

            structure.preview = canvas;
        }
    }

    createPatternForTile(id, baseColor) {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, this.tileSize, this.tileSize);

        const idNum = parseInt(id);

        if (idNum === 0) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, this.tileSize, this.tileSize);
        } else if (idNum === 1) {
            ctx.fillStyle = '#2a2a2a';
            for(let i = 0; i < 10; i++) {
                const x = Math.random() * this.tileSize;
                const y = Math.random() * this.tileSize;
                const size = Math.random() * 2 + 1;
                ctx.fillRect(x, y, size, size);
            }
        } else if (idNum === 2) {
            ctx.fillStyle = '#255021';
            for(let i = 0; i < 5; i++) {
                const x = Math.random() * this.tileSize;
                const y = Math.random() * this.tileSize;
                const width = Math.random() * 4 + 2;
                const height = Math.random() * 4 + 2;
                ctx.fillRect(x, y, width, height);
            }
        } else if (idNum === 3) {
            ctx.fillStyle = '#777777';
            ctx.strokeStyle = '#999999';
            ctx.lineWidth = 1;
            for(let i = 0; i < 4; i++) {
                const x = i * 8;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.tileSize);
                ctx.stroke();
            }
        } else if (idNum === 4) {
            ctx.fillStyle = '#444444';
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1;

            for(let y = 0; y < this.tileSize; y += 8) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.tileSize, y);
                ctx.stroke();
            }

            for(let x = 0; x < this.tileSize; x += 16) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.tileSize);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x + 8, 0);
                ctx.lineTo(x + 8, this.tileSize);
                ctx.stroke();
            }
        } else if (idNum === 5) {
            ctx.fillStyle = '#333333';
            for(let y = 0; y < this.tileSize; y += 8) {
                for(let x = 0; x < this.tileSize; x += 8) {
                    if((x + y) % 16 === 0) {
                        ctx.fillRect(x, y, 8, 8);
                    }
                }
            }
        } else if (idNum === 6) {
            ctx.fillStyle = '#0f2c0f';
            ctx.fillRect(12, 20, 8, 12);

            ctx.beginPath();
            ctx.arc(16, 12, 10, 0, Math.PI * 2);
            ctx.fill();
        } else if (idNum === 7) {
            ctx.fillStyle = '#0d4a7a';
            ctx.strokeStyle = '#1c6cb0';
            ctx.lineWidth = 2;

            for(let y = 4; y < this.tileSize; y += 8) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                for(let x = 0; x < this.tileSize; x += 8) {
                    ctx.lineTo(x, y + Math.sin(x * 0.3) * 2);
                }
                ctx.stroke();
            }
        } else if (idNum === 8) {
            ctx.fillStyle = '#ffff00';
            for(let x = 4; x < this.tileSize; x += 12) {
                ctx.fillRect(x, 14, 6, 4);
            }
        } else if (idNum === 9) {
            ctx.fillStyle = '#d4c9a8';
            for(let i = 0; i < 15; i++) {
                const x = Math.random() * this.tileSize;
                const y = Math.random() * this.tileSize;
                const size = Math.random() * 3 + 1;
                ctx.fillRect(x, y, size, size);
            }
        } else if (idNum === 10) {
            ctx.fillStyle = '#7a5c34';
            for(let i = 0; i < 8; i++) {
                const x = Math.random() * this.tileSize;
                const y = Math.random() * this.tileSize;
                const width = Math.random() * 6 + 3;
                const height = Math.random() * 6 + 3;
                ctx.fillRect(x, y, width, height);
            }
        } else if (idNum === 11) {
            ctx.fillStyle = '#88ccff';
            ctx.globalAlpha = 0.7;
            ctx.fillRect(0, 0, this.tileSize, this.tileSize);
            ctx.globalAlpha = 1.0;

            ctx.strokeStyle = '#66aaff';
            ctx.lineWidth = 2;
            ctx.strokeRect(4, 4, this.tileSize - 8, this.tileSize - 8);
        } else if (idNum === 12) {
            ctx.fillStyle = '#7a5c34';
            for(let i = 0; i < 10; i++) {
                const x = Math.random() * this.tileSize;
                const y = Math.random() * this.tileSize;
                const size = Math.random() * 4 + 2;
                ctx.fillRect(x, y, size, size);
            }
        } else if (idNum === 13) {
            ctx.fillStyle = '#333333';
            ctx.fillRect(0, 0, this.tileSize, this.tileSize);

            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2;

            for(let x = 0; x <= this.tileSize; x += 8) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.tileSize);
                ctx.stroke();
            }

            for(let y = 0; y <= this.tileSize; y += 8) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.tileSize, y);
                ctx.stroke();
            }
        }

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, this.tileSize - 1, this.tileSize - 1);

        return canvas;
    }

    createTransportPattern(id, transport, direction) {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, this.tileSize, this.tileSize);
        ctx.save();
        ctx.translate(this.tileSize / 2, this.tileSize / 2);
        ctx.rotate(direction * Math.PI / 2);

        const width = transport.size.width * 10;
        const height = transport.size.height * 10;

        ctx.fillStyle = transport.color;
        ctx.fillRect(-width/2, -height/2, width, height);

        switch(transport.type) {
            case 'car':
                ctx.fillStyle = '#88ccff';
                ctx.fillRect(-width/2 + 2, -height/2 + 2, width - 4, 8);

                ctx.fillStyle = '#ffff00';
                ctx.fillRect(-width/2 + 3, height/2 - 5, 4, 3);
                ctx.fillRect(width/2 - 7, height/2 - 5, 4, 3);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-8, 5, 16, 6);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 8px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('ABC', 0, 8);
                break;

            case 'truck':
                ctx.fillStyle = '#666666';
                ctx.fillRect(-width/2, -height/2, width/2, height);

                ctx.fillStyle = transport.color;
                ctx.fillRect(0, -height/2, width/2, height);

                ctx.fillStyle = '#88ccff';
                ctx.fillRect(-width/2 + 3, -height/2 + 3, width/2 - 6, 8);
                break;

            case 'bus':
                ctx.fillStyle = '#88ccff';
                for (let i = 0; i < 4; i++) {
                    ctx.fillRect(-width/2 + 5 + i * 12, -height/2 + 3, 8, 6);
                }

                ctx.fillStyle = '#000000';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('BUS', 0, 0);
                break;

            case 'bike':
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(-5, -5, 10, 6);

                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-10, -10);
                ctx.lineTo(10, -10);
                ctx.stroke();
                break;

            case 'helicopter':
                ctx.fillStyle = '#666666';
                ctx.beginPath();
                ctx.ellipse(0, 0, width/2, height/2, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-20, -5);
                ctx.lineTo(20, -5);
                ctx.moveTo(-5, -20);
                ctx.lineTo(-5, 20);
                ctx.stroke();
                break;
        }

        ctx.restore();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, this.tileSize - 2, this.tileSize - 2);

        return canvas;
    }

    createNpcPattern(npcType) {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = npcType.color;
        ctx.beginPath();
        ctx.arc(this.tileSize/2, this.tileSize/2, this.tileSize/2 - 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(npcType.type.charAt(0).toUpperCase(), this.tileSize/2, this.tileSize/2);

        return canvas;
    }

    initializeMap() {
        this.mapData = [];
        this.transportData = [];
        this.npcs = [];

        for (let y = 0; y < this.mapHeight; y++) {
            const row = [];
            const transportRow = [];
            for (let x = 0; x < this.mapWidth; x++) {
                row.push(2);
                transportRow.push(null);
            }
            this.mapData.push(row);
            this.transportData.push(transportRow);
        }

        this.canvas.width = this.mapWidth * this.tileSize;
        this.canvas.height = this.mapHeight * this.tileSize;
        this.selectionCanvas.width = this.canvas.width;
        this.selectionCanvas.height = this.canvas.height;
        this.gridCanvas.width = this.canvas.width;
        this.gridCanvas.height = this.canvas.height;
        this.previewCanvas.width = this.canvas.width;
        this.previewCanvas.height = this.canvas.height;

        this.addTestObjects();
    }

    addTestObjects() {
        const centerY = Math.floor(this.mapHeight / 2);

        for (let x = 0; x < this.mapWidth; x++) {
            this.mapData[centerY][x] = 1;
            this.mapData[centerY + 1][x] = 3;
            this.mapData[centerY - 1][x] = 3;

            if (x % 4 === 0) {
                this.mapData[centerY][x] = 8;
            }
        }

        for (let y = 5; y < 10; y++) {
            for (let x = 5; x < 15; x++) {
                this.mapData[y][x] = 4;
            }
        }

        for (let x = 5; x < 15; x++) {
            this.mapData[4][x] = 5;
        }

        this.mapData[15][20] = 6;
        this.mapData[17][22] = 6;
        this.mapData[19][18] = 6;

        for (let y = 30; y < 35; y++) {
            for (let x = 30; x < 40; x++) {
                this.mapData[y][x] = 7;
            }
        }

        this.placeTransport(centerY, 10, 200, 0);
        this.placeTransport(centerY, 15, 201, 1);
        this.placeTransport(centerY + 2, 20, 202, 2);
        this.placeTransport(centerY - 2, 25, 203, 3);

        // Добавляем тестовых NPC
        this.placeNpc(centerY + 5, 10, 300);
        this.placeNpc(centerY - 5, 15, 301);
        this.placeNpc(centerY, 20, 302);
    }

    createTilePalette() {
        const palette = document.getElementById('tilePalette');
        if (!palette) return;

        palette.innerHTML = '';

        for (const id in this.tiles) {
            this.createPaletteItem(palette, 'tile', id, this.tiles[id].name, this.tiles[id].pattern);
        }
    }

    createTransportPalette() {
        const palette = document.getElementById('transportPalette');
        if (!palette) return;

        palette.innerHTML = '';

        for (const id in this.transports) {
            const transport = this.transports[id];
            this.createPaletteItem(palette, 'transport', id, transport.name, transport.patterns[0]);
        }
    }

    createTriggersPalette() {
        const palette = document.getElementById('triggersPalette');
        if (!palette) return;

        palette.innerHTML = '';

        for (const id in this.triggers) {
            this.createPaletteItem(palette, 'trigger', id, this.triggers[id].name, this.triggers[id].pattern);
        }
    }

    createStructuresPalette() {
        const palette = document.getElementById('structuresPalette');
        if (!palette) return;

        palette.innerHTML = '';

        for (const id in this.structures) {
            this.createPaletteItem(palette, 'structure', id, this.structures[id].name, this.structures[id].preview);
        }
    }

    createNpcPalette() {
        const palette = document.getElementById('npcPalette');
        if (!palette) return;

        palette.innerHTML = '';

        for (const id in this.npcTypes) {
            const npc = this.npcTypes[id];
            this.createPaletteItem(palette, 'npc', id, npc.name, this.createNpcPattern(npc));
        }
    }

    createPaletteItem(parent, type, id, name, pattern) {
        const item = document.createElement('div');
        item.className = 'palette-item';
        item.dataset.type = type;
        item.dataset.id = id;
        item.title = `${name} (ID: ${id})`;

        item.style.backgroundImage = `url(${pattern.toDataURL()})`;

        const label = document.createElement('div');
        label.className = 'palette-label';
        label.textContent = id;
        item.appendChild(label);

        const nameElement = document.createElement('div');
        nameElement.className = 'palette-name';
        nameElement.textContent = name.length > 10 ? name.substring(0, 10) + '...' : name;
        item.appendChild(nameElement);

        parent.appendChild(item);
        return item;
    }

    initMissionEditor() {
        this.loadMissionsList();

        this.updateTriggerSelects();

        document.getElementById('missions').addEventListener('click', () => this.openMissionEditor());
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        document.getElementById('newMissionBtn').addEventListener('click', () => this.createNewMission());
        document.getElementById('saveMissionBtn').addEventListener('click', () => this.saveMission());
        document.getElementById('deleteMissionBtn').addEventListener('click', () => this.deleteMission());
        document.getElementById('testMissionBtn').addEventListener('click', () => this.testMission());

        document.getElementById('addTargetTriggerBtn').addEventListener('click', () => this.addTargetTrigger());
        document.getElementById('addObjectiveBtn').addEventListener('click', () => this.addObjective());
        document.getElementById('addItemRewardBtn').addEventListener('click', () => this.addItemReward());
        document.getElementById('addDialogBtn').addEventListener('click', () => this.addDialog());

        document.getElementById('selectStartTriggerBtn').addEventListener('click', () => this.selectTriggerOnMap('start'));
        document.getElementById('selectEndTriggerBtn').addEventListener('click', () => this.selectTriggerOnMap('end'));

        document.getElementById('missionType').addEventListener('change', (e) => this.onMissionTypeChange(e.target.value));

        this.setupDialogEditor();
        this.setupItemEditor();

        window.addEventListener('click', (e) => {
            if (e.target === this.missionEditorModal) this.closeModals();
            if (e.target === this.dialogEditorModal) this.closeDialogEditor();
            if (e.target === this.itemEditorModal) this.closeItemEditor();
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                this.openMissionEditor();
            }
        });
    }

    loadMissionsList() {
        const container = document.getElementById('missionsContainer');
        container.innerHTML = '';

        this.missionManager.missions.forEach(mission => {
            const missionElement = document.createElement('div');
            missionElement.className = 'mission-item';
            missionElement.dataset.missionId = mission.id;

            missionElement.innerHTML = `
                <div class="mission-item-title">${mission.name}</div>
                <div class="mission-item-type">${this.getMissionTypeName(mission.type)}</div>
                <div class="mission-item-desc">${mission.description.substring(0, 50)}${mission.description.length > 50 ? '...' : ''}</div>
            `;

            missionElement.addEventListener('click', () => this.loadMission(mission.id));

            container.appendChild(missionElement);
        });
    }

    getMissionTypeName(type) {
        const types = {
            'trigger': 'Триггер активации',
            'collection': 'Сбор предметов',
            'delivery': 'Доставка',
            'elimination': 'Уничтожение',
            'escort': 'Эскорт',
            'race': 'Гонка',
            'map_transition': 'Переход на карту',
            'dialog': 'Диалог',
            'combination': 'Комбинированная'
        };
        return types[type] || type;
    }

    loadMission(missionId) {
        const mission = this.missionManager.getMission(missionId);
        if (!mission) return;

        this.editingMissionId = missionId;

        document.querySelectorAll('.mission-item').forEach(item => {
            item.classList.remove('active');
        });

        const missionElement = document.querySelector(`.mission-item[data-mission-id="${missionId}"]`);
        if (missionElement) {
            missionElement.classList.add('active');
        }

        document.getElementById('missionId').value = mission.id;
        document.getElementById('missionName').value = mission.name;
        document.getElementById('missionDescription').value = mission.description;
        document.getElementById('missionType').value = mission.type;
        document.getElementById('missionDifficulty').value = mission.difficulty;
        document.getElementById('missionTimeLimit').value = mission.timeLimit;

        document.getElementById('missionStartTrigger').value = mission.startTrigger || '';
        document.getElementById('missionEndTrigger').value = mission.endTrigger || '';

        this.updateTargetTriggersList(mission.targetTriggers);

        document.getElementById('missionExpReward').value = mission.rewards.experience;
        document.getElementById('missionMoneyReward').value = mission.rewards.money;
        this.updateItemsRewardList(mission.rewards.items);

        if (mission.mapTransition) {
            document.getElementById('missionTargetMap').value = mission.mapTransition.targetMap || '';
            document.getElementById('missionSpawnTrigger').value = mission.mapTransition.spawnTriggerId || '';
            document.getElementById('missionKeepInventory').checked = mission.mapTransition.keepInventory;
        }

        this.onMissionTypeChange(mission.type);

        this.updateDialogsList(mission.dialogs);

        this.updateObjectivesList(mission.objectives);
    }

    createNewMission() {
        const missionId = this.missionManager.getNextMissionId();
        const missionName = `Новая миссия ${missionId}`;
        const mission = new Mission(missionId, missionName, 'Описание новой миссии');

        this.missionManager.addMission(mission);
        this.loadMissionsList();
        this.loadMission(missionId);
    }

    saveMission() {
        if (!this.editingMissionId) return;

        const mission = this.missionManager.getMission(this.editingMissionId);
        if (!mission) return;

        mission.name = document.getElementById('missionName').value;
        mission.description = document.getElementById('missionDescription').value;
        mission.type = document.getElementById('missionType').value;
        mission.difficulty = document.getElementById('missionDifficulty').value;
        mission.timeLimit = parseInt(document.getElementById('missionTimeLimit').value) || 0;

        mission.startTrigger = document.getElementById('missionStartTrigger').value || null;
        mission.endTrigger = document.getElementById('missionEndTrigger').value || null;

        mission.rewards.experience = parseInt(document.getElementById('missionExpReward').value) || 0;
        mission.rewards.money = parseInt(document.getElementById('missionMoneyReward').value) || 0;

        mission.mapTransition.targetMap = document.getElementById('missionTargetMap').value || null;
        mission.mapTransition.spawnTriggerId = document.getElementById('missionSpawnTrigger').value || null;
        mission.mapTransition.keepInventory = document.getElementById('missionKeepInventory').checked;

        this.loadMissionsList();

        alert(`Миссия "${mission.name}" сохранена!`);
    }

    deleteMission() {
        if (!this.editingMissionId) return;

        if (confirm('Вы уверены, что хотите удалить эту миссию?')) {
            this.missionManager.removeMission(this.editingMissionId);
            this.loadMissionsList();
            this.clearMissionForm();
            alert('Миссия удалена!');
        }
    }

    testMission() {
        if (!this.editingMissionId) return;

        const mission = this.missionManager.getMission(this.editingMissionId);
        if (!mission) return;

        alert(`Тестирование миссии "${mission.name}"\n\nТип: ${this.getMissionTypeName(mission.type)}\nСложность: ${mission.difficulty}\nНаграда: ${mission.rewards.experience} опыта, ${mission.rewards.money} денег`);
    }

    updateTargetTriggersList(targetTriggers) {
        const container = document.getElementById('missionTargetTriggersList');
        container.innerHTML = '';

        targetTriggers.forEach((target, index) => {
            const item = document.createElement('div');
            item.className = 'target-trigger-item';

            const select = document.createElement('select');
            select.innerHTML = this.getTriggersOptions();
            select.value = target.triggerId;

            const countInput = document.createElement('input');
            countInput.type = 'number';
            countInput.min = 1;
            countInput.value = target.requiredCount || 1;
            countInput.style.width = '80px';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-list-item';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', () => {
                container.removeChild(item);
                const mission = this.missionManager.getMission(this.editingMissionId);
                if (mission) {
                    mission.targetTriggers.splice(index, 1);
                }
            });

            item.appendChild(select);
            item.appendChild(countInput);
            item.appendChild(removeBtn);
            container.appendChild(item);

            select.addEventListener('change', () => {
                if (mission) {
                    mission.targetTriggers[index].triggerId = select.value;
                }
            });

            countInput.addEventListener('change', () => {
                if (mission) {
                    mission.targetTriggers[index].requiredCount = parseInt(countInput.value) || 1;
                }
            });
        });
    }

    addTargetTrigger() {
        const mission = this.missionManager.getMission(this.editingMissionId);
        if (!mission) return;

        mission.addTargetTrigger(112, 1);
        this.updateTargetTriggersList(mission.targetTriggers);
    }

    updateItemsRewardList(items) {
        const container = document.getElementById('missionItemsRewardList');
        container.innerHTML = '';

        items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'item-reward-item';

            const select = document.createElement('select');
            select.innerHTML = this.getItemsOptions();
            select.value = item.itemId || 'health_pack';

            const countInput = document.createElement('input');
            countInput.type = 'number';
            countInput.min = 1;
            countInput.value = item.quantity || 1;
            countInput.style.width = '80px';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-list-item';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', () => {
                container.removeChild(itemElement);
                const mission = this.missionManager.getMission(this.editingMissionId);
                if (mission) {
                    mission.rewards.items.splice(index, 1);
                }
            });

            itemElement.appendChild(select);
            itemElement.appendChild(countInput);
            itemElement.appendChild(removeBtn);
            container.appendChild(itemElement);

            select.addEventListener('change', () => {
                if (mission) {
                    mission.rewards.items[index].itemId = select.value;
                }
            });

            countInput.addEventListener('change', () => {
                if (mission) {
                    mission.rewards.items[index].quantity = parseInt(countInput.value) || 1;
                }
            });
        });
    }

    addItemReward() {
        const mission = this.missionManager.getMission(this.editingMissionId);
        if (!mission) return;

        mission.rewards.items.push({
            itemId: 'health_pack',
            quantity: 1
        });

        this.updateItemsRewardList(mission.rewards.items);
    }

    addObjective() {
        const mission = this.missionManager.getMission(this.editingMissionId);
        if (!mission) return;

        const objective = mission.addObjective('trigger', {});
        this.updateObjectivesList(mission.objectives);
    }

    updateObjectivesList(objectives) {
        const container = document.getElementById('missionObjectivesContainer');
        container.innerHTML = '';

        objectives.forEach((objective, index) => {
            const objectiveElement = document.createElement('div');
            objectiveElement.className = 'objective-item';
            objectiveElement.dataset.type = objective.type;

            let description = '';
            switch(objective.type) {
                case 'trigger':
                    description = 'Активировать триггер';
                    break;
                case 'collect':
                    description = 'Собрать предметы';
                    break;
                case 'deliver':
                    description = 'Доставить предмет';
                    break;
                case 'eliminate':
                    description = 'Уничтожить цели';
                    break;
                case 'escort':
                    description = 'Эскортировать персонажа';
                    break;
                default:
                    description = objective.description;
            }

            objectiveElement.innerHTML = `
                <div class="objective-header">
                    <span>📌 ${description}</span>
                    <button class="remove-objective">&times;</button>
                </div>
                <div class="objective-content">
                    <p>${objective.data.details || 'Детали цели'}</p>
                </div>
            `;

            objectiveElement.querySelector('.remove-objective').addEventListener('click', () => {
                container.removeChild(objectiveElement);
                mission.objectives.splice(index, 1);
            });

            container.appendChild(objectiveElement);
        });
    }

    addDialog() {
        this.openDialogEditor();
    }

    updateDialogsList(dialogs) {
        const container = document.getElementById('missionDialogsList');
        container.innerHTML = '';

        dialogs.forEach((dialog, index) => {
            const dialogElement = document.createElement('div');
            dialogElement.className = 'dialog-item';

            dialogElement.innerHTML = `
                <div class="dialog-item-header">
                    <span class="dialog-item-character">${dialog.character || 'Персонаж'}</span>
                    <button class="edit-dialog-btn" data-index="${index}">✏️</button>
                </div>
                <div class="dialog-item-text">${dialog.text.substring(0, 100)}${dialog.text.length > 100 ? '...' : ''}</div>
                ${dialog.options.length > 0 ? `<div class="dialog-item-options">${dialog.options.length} вариантов ответа</div>` : ''}
            `;

            dialogElement.querySelector('.edit-dialog-btn').addEventListener('click', (e) => {
                this.openDialogEditor(dialog, index);
            });

            container.appendChild(dialogElement);
        });
    }

    onMissionTypeChange(type) {
        const mapTransitionSection = document.getElementById('missionMapTransitionSection');
        const dialogsSection = document.getElementById('missionDialogsSection');
        const targetTriggersGroup = document.getElementById('missionTargetTriggersGroup');

        if (type === 'map_transition') {
            mapTransitionSection.style.display = 'block';
        } else {
            mapTransitionSection.style.display = 'none';
        }

        if (type === 'dialog') {
            dialogsSection.style.display = 'block';
        } else {
            dialogsSection.style.display = 'none';
        }

        if (['collection', 'delivery', 'elimination'].includes(type)) {
            targetTriggersGroup.style.display = 'block';
        } else {
            targetTriggersGroup.style.display = 'none';
        }
    }

    getTriggersOptions() {
        let options = '<option value="">-- Выберите триггер --</option>';

        for (const id in this.triggers) {
            const trigger = this.triggers[id];
            options += `<option value="${id}">${id}: ${trigger.name}</option>`;
        }

        return options;
    }

    getItemsOptions() {
        let options = '<option value="">-- Выберите предмет --</option>';

        for (const id in this.missionManager.items) {
            const item = this.missionManager.items[id];
            options += `<option value="${id}">${item.name}</option>`;
        }

        return options;
    }

    updateTriggerSelects() {
        const options = this.getTriggersOptions();

        document.getElementById('missionStartTrigger').innerHTML = options;
        document.getElementById('missionEndTrigger').innerHTML = options;
        document.getElementById('dialogTrigger').innerHTML = options;
    }

    selectTriggerOnMap(type) {
        alert(`Выберите триггер на карте для "${type === 'start' ? 'начала' : 'завершения'}" миссии. Кликните по нужному триггеру.`);

        const oldClickHandler = this.canvas.onclick;
        const oldTool = this.tool;

        this.tool = 'select';

        this.canvas.onclick = (e) => {
            const pos = this.getTilePosition(e.clientX, e.clientY);
            if (pos) {
                const tileId = this.mapData[pos.y][pos.x];

                if (tileId >= 100 && this.triggers[tileId]) {
                    const selectId = type === 'start' ? 'missionStartTrigger' : 'missionEndTrigger';
                    document.getElementById(selectId).value = tileId;

                    const mission = this.missionManager.getMission(this.editingMissionId);
                    if (mission) {
                        if (type === 'start') {
                            mission.startTrigger = tileId;
                        } else {
                            mission.endTrigger = tileId;
                        }
                    }

                    alert(`Триггер ${tileId} выбран!`);
                } else {
                    alert('Это не триггер. Выберите клетку с триггером.');
                }
            }

            this.canvas.onclick = oldClickHandler;
            this.tool = oldTool;
        };
    }

    openMissionEditor() {
        this.missionEditorModal.style.display = 'block';
    }

    closeModals() {
        this.missionEditorModal.style.display = 'none';
        this.dialogEditorModal.style.display = 'none';
        this.itemEditorModal.style.display = 'none';
    }

    clearMissionForm() {
        this.editingMissionId = null;

        document.getElementById('missionId').value = '';
        document.getElementById('missionName').value = '';
        document.getElementById('missionDescription').value = '';
        document.getElementById('missionType').value = 'trigger';
        document.getElementById('missionDifficulty').value = 'normal';
        document.getElementById('missionTimeLimit').value = 0;
        document.getElementById('missionStartTrigger').value = '';
        document.getElementById('missionEndTrigger').value = '';
        document.getElementById('missionExpReward').value = 100;
        document.getElementById('missionMoneyReward').value = 500;
        document.getElementById('missionTargetMap').value = '';
        document.getElementById('missionSpawnTrigger').value = '';

        document.getElementById('missionTargetTriggersList').innerHTML = '';
        document.getElementById('missionItemsRewardList').innerHTML = '';
        document.getElementById('missionDialogsList').innerHTML = '';
        document.getElementById('missionObjectivesContainer').innerHTML = '';

        document.querySelectorAll('.mission-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    setupDialogEditor() {
        document.getElementById('saveDialogBtn').addEventListener('click', () => this.saveDialog());
        document.getElementById('cancelDialogBtn').addEventListener('click', () => this.closeDialogEditor());
        document.getElementById('addDialogOptionBtn').addEventListener('click', () => this.addDialogOption());
    }

    openDialogEditor(dialog = null, index = null) {
        this.editingDialog = { dialog, index };

        if (dialog) {
            document.getElementById('dialogCharacter').value = dialog.character || '';
            document.getElementById('dialogText').value = dialog.text || '';
            document.getElementById('dialogImage').value = dialog.image || '';
            document.getElementById('dialogTrigger').value = dialog.trigger || '';
            document.getElementById('dialogNext').value = dialog.nextDialog || '';

            this.updateDialogOptionsList(dialog.options);
        } else {
            document.getElementById('dialogCharacter').value = '';
            document.getElementById('dialogText').value = '';
            document.getElementById('dialogImage').value = '';
            document.getElementById('dialogTrigger').value = '';
            document.getElementById('dialogNext').value = '';
            document.getElementById('dialogOptionsList').innerHTML = '';
        }

        this.dialogEditorModal.style.display = 'block';
    }

    closeDialogEditor() {
        this.dialogEditorModal.style.display = 'none';
        this.editingDialog = null;
    }

    saveDialog() {
        const mission = this.missionManager.getMission(this.editingMissionId);
        if (!mission) return;

        const character = document.getElementById('dialogCharacter').value;
        const text = document.getElementById('dialogText').value;
        const image = document.getElementById('dialogImage').value;
        const trigger = document.getElementById('dialogTrigger').value;
        const nextDialog = document.getElementById('dialogNext').value;

        const options = [];
        document.querySelectorAll('.dialog-option-item').forEach(item => {
            const optionText = item.querySelector('.dialog-option-text').value;
            const next = item.querySelector('.dialog-option-next').value;
            if (optionText) {
                options.push({
                    text: optionText,
                    next: next || null
                });
            }
        });

        if (this.editingDialog.index !== null && mission.dialogs[this.editingDialog.index]) {
            mission.dialogs[this.editingDialog.index] = {
                ...mission.dialogs[this.editingDialog.index],
                character,
                text,
                image,
                options,
                trigger: trigger || null,
                nextDialog: nextDialog || null
            };
        } else {
            mission.addDialog(character, text, options);
            const newDialog = mission.dialogs[mission.dialogs.length - 1];
            newDialog.image = image;
            newDialog.trigger = trigger || null;
            newDialog.nextDialog = nextDialog || null;
        }

        this.updateDialogsList(mission.dialogs);
        this.closeDialogEditor();
    }

    addDialogOption() {
        const container = document.getElementById('dialogOptionsList');

        const optionElement = document.createElement('div');
        optionElement.className = 'dialog-option-item';
        optionElement.innerHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                <input type="text" class="dialog-option-text" placeholder="Текст варианта ответа" style="flex: 1;">
                <input type="text" class="dialog-option-next" placeholder="ID след. диалога" style="width: 150px;">
                <button class="remove-dialog-option" style="background: #ff6b6b; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer;">×</button>
            </div>
        `;

        optionElement.querySelector('.remove-dialog-option').addEventListener('click', () => {
            container.removeChild(optionElement);
        });

        container.appendChild(optionElement);
    }

    updateDialogOptionsList(options) {
        const container = document.getElementById('dialogOptionsList');
        container.innerHTML = '';

        options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'dialog-option-item';
            optionElement.innerHTML = `
                <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                    <input type="text" class="dialog-option-text" value="${option.text || ''}" placeholder="Текст варианта ответа" style="flex: 1;">
                    <input type="text" class="dialog-option-next" value="${option.next || ''}" placeholder="ID след. диалога" style="width: 150px;">
                    <button class="remove-dialog-option" style="background: #ff6b6b; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer;">×</button>
                </div>
            `;

            optionElement.querySelector('.remove-dialog-option').addEventListener('click', () => {
                container.removeChild(optionElement);
            });

            container.appendChild(optionElement);
        });
    }

    setupItemEditor() {
        document.getElementById('saveItemBtn').addEventListener('click', () => this.saveItem());
        document.getElementById('cancelItemBtn').addEventListener('click', () => this.closeItemEditor());
    }

    openItemEditor(item = null) {
        this.editingItem = item;

        if (item) {
            // Заполняем форму данными предмета
        } else {
            // Очищаем форму для нового предмета
        }

        this.itemEditorModal.style.display = 'block';
    }

    closeItemEditor() {
        this.itemEditorModal.style.display = 'none';
        this.editingItem = null;
    }

    saveItem() {
        this.closeItemEditor();
    }

    updateMissionInfo(triggerId) {
        const missions = this.missionManager.getMissionsByTrigger(triggerId);

        if (missions.length > 0) {
            this.missionInfoDisplay.style.display = 'block';
            this.editMissionBtn.style.display = 'block';

            let info = '<strong>Связанные миссии:</strong><br>';
            missions.forEach(mission => {
                info += `• ${mission.name} (${this.getMissionTypeName(mission.type)})<br>`;
            });

            this.missionInfoDisplay.innerHTML = info;

            this.editMissionBtn.onclick = () => {
                if (missions.length === 1) {
                    this.openMissionEditor();
                    this.loadMission(missions[0].id);
                } else {
                    alert('С этим триггером связано несколько миссий. Откройте редактор миссий для просмотра.');
                }
            };
        } else {
            this.missionInfoDisplay.style.display = 'none';
            this.editMissionBtn.style.display = 'none';
        }
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());

        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        document.getElementById('tilePalette').addEventListener('click', (e) => this.onPaletteClick(e));
        document.getElementById('transportPalette').addEventListener('click', (e) => this.onPaletteClick(e));
        document.getElementById('triggersPalette').addEventListener('click', (e) => this.onPaletteClick(e));
        document.getElementById('structuresPalette').addEventListener('click', (e) => this.onPaletteClick(e));
        document.getElementById('npcPalette').addEventListener('click', (e) => this.onPaletteClick(e));

        document.getElementById('brush').addEventListener('click', () => this.setTool('brush'));
        document.getElementById('fill').addEventListener('click', () => this.setTool('fill'));
        document.getElementById('erase').addEventListener('click', () => this.setTool('erase'));
        document.getElementById('structure').addEventListener('click', () => this.setTool('structure'));
        document.getElementById('transport').addEventListener('click', () => this.setTool('transport'));
        document.getElementById('select').addEventListener('click', () => this.setTool('select'));
        document.getElementById('missions').addEventListener('click', () => this.openMissionEditor());
        document.getElementById('npc').addEventListener('click', () => this.setTool('npc'));
        document.getElementById('runGame').addEventListener('click', () => this.runGame());

        document.getElementById('rotateLeft').addEventListener('click', () => this.rotateTransport(-1));
        document.getElementById('rotateRight').addEventListener('click', () => this.rotateTransport(1));
        document.getElementById('transportDirection').addEventListener('change', (e) => {
            this.transportDirection = parseInt(e.target.value);
            this.previewState.direction = this.transportDirection;
            this.previewState.needsUpdate = true;
        });

        document.getElementById('showPreview').addEventListener('change', (e) => {
            this.showPreview = e.target.checked;
            if (!this.showPreview) {
                this.clearPreview();
            }
        });

        document.getElementById('previewOpacity').addEventListener('input', (e) => {
            this.previewOpacity = parseInt(e.target.value) / 100;
            document.getElementById('opacityValue').textContent = e.target.value + '%';
            this.previewState.needsUpdate = true;
        });

        document.getElementById('loadMapBtn').addEventListener('click', () => {
            document.getElementById('loadMap').click();
        });
        document.getElementById('loadMap').addEventListener('change', (e) => this.loadMap(e));
        document.getElementById('saveMap').addEventListener('click', () => this.saveMap());
        document.getElementById('exportImage').addEventListener('click', () => this.exportAsImage());
        document.getElementById('exportGame').addEventListener('click', () => this.exportGame());
        document.getElementById('resize').addEventListener('click', () => this.resizeMap());

        document.getElementById('previewOpacity').value = this.previewOpacity * 100;
        document.getElementById('opacityValue').textContent = Math.round(this.previewOpacity * 100) + '%';

        this.updateToolInfo();
    }

    onPaletteClick(e) {
        const item = e.target.closest('.palette-item');
        if (!item) return;

        const type = item.dataset.type;
        const id = parseInt(item.dataset.id);

        document.querySelectorAll('.palette-item').forEach(el => {
            el.classList.remove('selected');
        });

        item.classList.add('selected');

        this.currentTile = null;
        this.currentTransport = null;
        this.currentTrigger = null;
        this.currentStructure = null;
        this.currentNpc = null;

        switch(type) {
            case 'tile':
                this.currentTile = id;
                this.setTool('brush');
                break;
            case 'transport':
                this.currentTransport = id;
                this.setTool('transport');
                break;
            case 'trigger':
                this.currentTrigger = id;
                this.setTool('brush');
                break;
            case 'structure':
                this.currentStructure = id;
                this.setTool('structure');
                break;
            case 'npc':
                this.currentNpc = id;
                this.setTool('npc');
                break;
        }

        this.updateObjectInfo();
        this.updateToolInfo();
    }

    setTool(tool) {
        this.tool = tool;

        document.querySelectorAll('.tools button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(tool).classList.add('active');

        this.updateToolInfo();
    }

    rotateTransport(direction) {
        this.transportDirection = (this.transportDirection + direction + 4) % 4;
        document.getElementById('transportDirection').value = this.transportDirection;
        this.previewState.direction = this.transportDirection;
        this.previewState.needsUpdate = true;
        this.updateToolInfo();
    }

    onMouseDown(e) {
        const pos = this.getTilePosition(e.clientX, e.clientY);
        if (!pos) return;

        this.isDrawing = true;

        if (this.tool === 'select') {
            this.selection.startX = pos.x;
            this.selection.startY = pos.y;
            this.selection.endX = pos.x;
            this.selection.endY = pos.y;
            this.selection.active = true;
            this.renderSelection();
        } else if (this.tool === 'fill') {
            this.floodFill(pos.x, pos.y);
        } else if (this.tool === 'structure' && this.currentStructure) {
            this.placeStructure(pos.x, pos.y);
        } else if (this.tool === 'transport' && this.currentTransport) {
            this.placeTransport(pos.x, pos.y, this.currentTransport, this.transportDirection);
        } else if (this.tool === 'npc' && this.currentNpc) {
            this.placeNpc(pos.x, pos.y);
        } else {
            this.placeTile(pos.x, pos.y);
        }
    }

    onMouseMove(e) {
        const pos = this.getTilePosition(e.clientX, e.clientY);
        if (!pos) {
            this.clearPreview();
            return;
        }

        this.coordinatesDisplay.textContent = `X: ${pos.x}, Y: ${pos.y}`;

        this.updatePreview(pos.x, pos.y);

        if (this.isDrawing) {
            if (this.tool === 'select') {
                this.selection.endX = pos.x;
                this.selection.endY = pos.y;
                this.renderSelection();
            } else if (this.tool === 'brush' || this.tool === 'erase' || this.tool === 'transport' || this.tool === 'npc') {
                this.placeTile(pos.x, pos.y);
            }
        }
    }

    onMouseUp(e) {
        this.isDrawing = false;

        if (this.tool === 'select' && this.selection.active) {
            this.finalizeSelection();
        }
    }

    onMouseLeave() {
        this.isDrawing = false;
        this.clearPreview();
    }

    onKeyDown(e) {
        if (e.key === 'Delete' && this.selection.active) {
            this.deleteSelection();
        }

        if (e.ctrlKey) {
            switch(e.key) {
                case 'b': e.preventDefault(); this.setTool('brush'); break;
                case 'f': e.preventDefault(); this.setTool('fill'); break;
                case 'e': e.preventDefault(); this.setTool('erase'); break;
                case 's': e.preventDefault(); this.setTool('structure'); break;
                case 't': e.preventDefault(); this.setTool('transport'); break;
                case 'g': e.preventDefault(); this.setTool('select'); break;
                case 'n': e.preventDefault(); this.setTool('npc'); break;
                case 'p': e.preventDefault();
                    this.showPreview = !this.showPreview;
                    document.getElementById('showPreview').checked = this.showPreview;
                    if (!this.showPreview) this.clearPreview();
                    break;
                case 'm': e.preventDefault(); this.openMissionEditor(); break;
                case 'r': e.preventDefault(); this.runGame(); break;
            }
        }

        if (this.tool === 'transport' && this.currentTransport) {
            switch(e.key) {
                case 'ArrowLeft': e.preventDefault(); this.rotateTransport(-1); break;
                case 'ArrowRight': e.preventDefault(); this.rotateTransport(1); break;
            }
        }
    }

    getTilePosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((clientX - rect.left) / this.tileSize);
        const y = Math.floor((clientY - rect.top) / this.tileSize);

        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            return { x, y };
        }
        return null;
    }

    placeTile(x, y) {
        if (this.tool === 'erase') {
            this.mapData[y][x] = 0;
            this.transportData[y][x] = null;

            // Удаляем NPC на этой клетке
            this.npcs = this.npcs.filter(npc => !(Math.floor(npc.x) === x && Math.floor(npc.y) === y));
        } else if (this.currentTile !== null) {
            this.mapData[y][x] = this.currentTile;
        } else if (this.currentTrigger !== null) {
            this.mapData[y][x] = this.currentTrigger;
        }

        this.renderTile(x, y);
    }

    placeTransport(x, y, transportId, direction) {
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            this.transportData[y][x] = {
                id: transportId,
                direction: direction
            };
            this.renderTile(x, y);
        }
    }

    placeStructure(x, y) {
        const structure = this.structures[this.currentStructure];
        if (!structure) return;

        if (x + structure.width > this.mapWidth || y + structure.height > this.mapHeight) {
            alert('Структура не помещается на карту!');
            return;
        }

        for (let sy = 0; sy < structure.height; sy++) {
            for (let sx = 0; sx < structure.width; sx++) {
                const tileId = structure.data[sy][sx];
                if (tileId !== 0) {
                    const targetX = x + sx;
                    const targetY = y + sy;
                    if (targetX < this.mapWidth && targetY < this.mapHeight) {
                        this.mapData[targetY][targetX] = tileId;
                        this.transportData[targetY][targetX] = null;
                    }
                }
            }
        }

        this.render();
    }

    placeNpc(x, y, npcTypeId = null) {
        const typeId = npcTypeId || this.currentNpc;
        const npcType = this.npcTypes[typeId];
        if (!npcType) return;

        // Проверяем, нет ли уже NPC на этой клетке
        const existingNpc = this.npcs.find(npc => Math.floor(npc.x) === x && Math.floor(npc.y) === y);
        if (existingNpc) {
            // Удаляем существующего NPC
            this.npcs = this.npcs.filter(npc => npc !== existingNpc);
        }

        const npcId = this.npcs.length + 1;
        const npc = new NPC(npcId, npcType.type, x, y);
        this.npcs.push(npc);

        // Очищаем тайл под NPC
        this.mapData[y][x] = 0;
        this.renderTile(x, y);
        this.renderNpc(npc);
    }

    renderNpc(npc) {
        const npcType = Object.values(this.npcTypes).find(nt => nt.type === npc.type);
        if (!npcType) return;

        const pattern = this.createNpcPattern(npcType);
        this.ctx.drawImage(
            pattern,
            npc.x * this.tileSize,
            npc.y * this.tileSize,
            this.tileSize,
            this.tileSize
        );
    }

    floodFill(startX, startY) {
        const targetTile = this.mapData[startY][startX];
        const replacementTile = this.currentTile !== null ? this.currentTile : 0;

        if (targetTile === replacementTile) return;

        const stack = [{x: startX, y: startY}];
        const visited = new Set();

        while (stack.length > 0) {
            const {x, y} = stack.pop();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) continue;
            if (this.mapData[y][x] !== targetTile) continue;

            this.mapData[y][x] = replacementTile;
            visited.add(key);

            stack.push({x: x+1, y});
            stack.push({x: x-1, y});
            stack.push({x, y: y+1});
            stack.push({x, y: y-1});
        }

        this.render();
    }

    renderSelection() {
        this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);

        if (!this.selection.active) return;

        const startX = Math.min(this.selection.startX, this.selection.endX);
        const startY = Math.min(this.selection.startY, this.selection.endY);
        const endX = Math.max(this.selection.startX, this.selection.endX);
        const endY = Math.max(this.selection.startY, this.selection.endY);

        const width = (endX - startX + 1) * this.tileSize;
        const height = (endY - startY + 1) * this.tileSize;

        this.selectionCtx.strokeStyle = '#00ff00';
        this.selectionCtx.lineWidth = 2;
        this.selectionCtx.setLineDash([5, 5]);
        this.selectionCtx.strokeRect(
            startX * this.tileSize,
            startY * this.tileSize,
            width,
            height
        );
        this.selectionCtx.setLineDash([]);

        const count = (endX - startX + 1) * (endY - startY + 1);
        this.selectionInfoDisplay.textContent = `Выделено: ${count} тайлов`;
    }

    finalizeSelection() {
        this.selection.active = false;
        this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
    }

    deleteSelection() {
        if (!this.selection.active) return;

        const startX = Math.min(this.selection.startX, this.selection.endX);
        const startY = Math.min(this.selection.startY, this.selection.endY);
        const endX = Math.max(this.selection.startX, this.selection.endX);
        const endY = Math.max(this.selection.startY, this.selection.endY);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                this.mapData[y][x] = 0;
                this.transportData[y][x] = null;

                // Удаляем NPC в выделенной области
                this.npcs = this.npcs.filter(npc =>
                    !(Math.floor(npc.x) >= startX && Math.floor(npc.x) <= endX &&
                        Math.floor(npc.y) >= startY && Math.floor(npc.y) <= endY)
                );
            }
        }

        this.render();
        this.finalizeSelection();
    }

    renderTile(x, y) {
        const tileId = this.mapData[y][x];
        const tile = this.tiles[tileId];

        if (tile && tile.pattern) {
            this.ctx.drawImage(
                tile.pattern,
                x * this.tileSize,
                y * this.tileSize,
                this.tileSize,
                this.tileSize
            );
        } else if (tileId >= 100) {
            const trigger = this.triggers[tileId];
            if (trigger && trigger.pattern) {
                this.ctx.drawImage(
                    trigger.pattern,
                    x * this.tileSize,
                    y * this.tileSize,
                    this.tileSize,
                    this.tileSize
                );
            }
        } else {
            this.ctx.fillStyle = '#2a2a2a';
            this.ctx.fillRect(
                x * this.tileSize,
                y * this.tileSize,
                this.tileSize,
                this.tileSize
            );
        }

        const transport = this.transportData[y][x];
        if (transport) {
            const transportInfo = this.transports[transport.id];
            if (transportInfo && transportInfo.patterns[transport.direction]) {
                this.ctx.drawImage(
                    transportInfo.patterns[transport.direction],
                    x * this.tileSize,
                    y * this.tileSize,
                    this.tileSize,
                    this.tileSize
                );
            }
        }

        // Рисуем NPC на этой клетке
        const npcOnTile = this.npcs.find(npc => Math.floor(npc.x) === x && Math.floor(npc.y) === y);
        if (npcOnTile) {
            this.renderNpc(npcOnTile);
        }

        this.renderGrid();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                this.renderTile(x, y);
            }
        }

        this.renderGrid();
    }

    renderGrid() {
        this.gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        this.gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.gridCtx.lineWidth = 1;

        for (let x = 0; x <= this.mapWidth; x++) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x * this.tileSize, 0);
            this.gridCtx.lineTo(x * this.tileSize, this.canvas.height);
            this.gridCtx.stroke();
        }

        for (let y = 0; y <= this.mapHeight; y++) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y * this.tileSize);
            this.gridCtx.lineTo(this.canvas.width, y * this.tileSize);
            this.gridCtx.stroke();
        }
    }

    updateToolInfo() {
        let toolText = '';
        switch(this.tool) {
            case 'brush':
                if (this.currentTile !== null) {
                    toolText = `Кисть: ${this.tiles[this.currentTile]?.name || 'Тайл'}`;
                } else if (this.currentTrigger !== null) {
                    toolText = `Триггер: ${this.triggers[this.currentTrigger]?.name || 'Триггер'}`;
                } else {
                    toolText = 'Кисть';
                }
                break;
            case 'fill':
                toolText = 'Заливка';
                break;
            case 'erase':
                toolText = 'Ластик';
                break;
            case 'structure':
                toolText = `Структура: ${this.structures[this.currentStructure]?.name || 'Структура'}`;
                break;
            case 'transport':
                const directions = ['Вверх', 'Вправо', 'Вниз', 'Влево'];
                toolText = `Транспорт: ${this.transports[this.currentTransport]?.name || 'Транспорт'} (${directions[this.transportDirection]})`;
                break;
            case 'select':
                toolText = 'Выделение';
                break;
            case 'npc':
                toolText = `NPC: ${this.npcTypes[this.currentNpc]?.name || 'NPC'}`;
                break;
        }

        this.toolInfoDisplay.textContent = `Инструмент: ${toolText}`;
    }

    updateObjectInfo() {
        let info = 'Нет';

        if (this.currentTile !== null) {
            info = `Тайл: ${this.tiles[this.currentTile]?.name || 'Неизвестно'} (ID: ${this.currentTile})`;
        } else if (this.currentTransport !== null) {
            info = `Транспорт: ${this.transports[this.currentTransport]?.name || 'Неизвестно'} (ID: ${this.currentTransport})`;
        } else if (this.currentTrigger !== null) {
            info = `Триггер: ${this.triggers[this.currentTrigger]?.name || 'Неизвестно'} (ID: ${this.currentTrigger})`;
        } else if (this.currentStructure !== null) {
            info = `Структура: ${this.structures[this.currentStructure]?.name || 'Неизвестно'} (ID: ${this.currentStructure})`;
        } else if (this.currentNpc !== null) {
            info = `NPC: ${this.npcTypes[this.currentNpc]?.name || 'Неизвестно'} (ID: ${this.currentNpc})`;
        }

        this.objectInfoDisplay.textContent = info;
    }

    runGame() {
        const map = {
            version: '5.0',
            width: this.mapWidth,
            height: this.mapHeight,
            tileSize: this.tileSize,
            mapData: this.mapData,
            transportData: this.transportData,
            npcs: this.npcs.map(npc => npc.toJSON()),
            missions: this.missionManager.toJSON(),
            tiles: Object.keys(this.tiles).map(id => ({
                id: parseInt(id),
                name: this.tiles[id].name
            })),
            transports: Object.keys(this.transports).map(id => ({
                id: parseInt(id),
                name: this.transports[id].name
            })),
            triggers: Object.keys(this.triggers).map(id => ({
                id: parseInt(id),
                name: this.triggers[id].name,
                type: this.triggers[id].type
            })),
            structures: Object.keys(this.structures).map(id => ({
                id: parseInt(id),
                name: this.structures[id].name
            }))
        };

        // Сохраняем карту в localStorage для игры
        localStorage.setItem('lastEditedMap', JSON.stringify(map));

        // Открываем игру в новом окне
        window.open('game.html', '_blank', 'width=1200,height=800,location=no,menubar=no,status=no,toolbar=no');
    }

    saveMap() {
        const map = {
            version: '5.0',
            width: this.mapWidth,
            height: this.mapHeight,
            tileSize: this.tileSize,
            mapData: this.mapData,
            transportData: this.transportData,
            npcs: this.npcs.map(npc => npc.toJSON()),
            missions: this.missionManager.toJSON(),
            tiles: Object.keys(this.tiles).map(id => ({
                id: parseInt(id),
                name: this.tiles[id].name
            })),
            transports: Object.keys(this.transports).map(id => ({
                id: parseInt(id),
                name: this.transports[id].name
            })),
            triggers: Object.keys(this.triggers).map(id => ({
                id: parseInt(id),
                name: this.triggers[id].name,
                type: this.triggers[id].type
            })),
            structures: Object.keys(this.structures).map(id => ({
                id: parseInt(id),
                name: this.structures[id].name
            }))
        };

        const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `gta_map_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Карта с миссиями и NPC сохранена успешно!');
    }

    async loadMap(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const map = JSON.parse(e.target.result);

                this.mapWidth = map.width;
                this.mapHeight = map.height;

                if (map.version >= '5.0') {
                    this.mapData = map.mapData;
                    this.transportData = map.transportData || [];
                    this.missionManager = MissionManager.fromJSON(map.missions);
                    this.npcs = map.npcs ? map.npcs.map(npc => NPC.fromJSON(npc)) : [];
                } else if (map.version >= '4.0') {
                    this.mapData = map.mapData;
                    this.transportData = map.transportData || [];
                    this.missionManager = new MissionManager();
                    this.npcs = [];
                } else {
                    this.mapData = map.data;
                    this.transportData = [];
                    this.missionManager = new MissionManager();
                    this.npcs = [];
                }

                if (!this.transportData || this.transportData.length !== this.mapHeight) {
                    this.transportData = [];
                    for (let y = 0; y < this.mapHeight; y++) {
                        const row = [];
                        for (let x = 0; x < this.mapWidth; x++) {
                            row.push(null);
                        }
                        this.transportData.push(row);
                    }
                }

                this.initializeMap();
                this.render();

                this.loadMissionsList();
                this.updateTriggerSelects();

                alert('Карта с миссиями и NPC загружена успешно!');
            } catch (err) {
                console.error('Ошибка загрузки карты:', err);
                alert('Неверный формат файла карты');
            }
        };
        reader.readAsText(file);
    }

    exportGame() {
        const gameData = {
            map: {
                width: this.mapWidth,
                height: this.mapHeight,
                tileSize: this.tileSize,
                data: this.mapData,
                transport: this.transportData
            },
            missions: this.missionManager.toJSON(),
            npcs: this.npcs.map(npc => npc.toJSON()),
            tilesets: {
                ground: this.tiles,
                triggers: this.triggers,
                transports: this.transports
            },
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                author: 'Map Editor'
            }
        };

        const optimizedData = JSON.stringify(gameData);

        const blob = new Blob([optimizedData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `game_data_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Данные для игры экспортированы успешно!');
    }

    exportAsImage() {
        const link = document.createElement('a');
        link.download = `gta_map_${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    resizeMap() {
        const widthInput = document.getElementById('width');
        const heightInput = document.getElementById('height');

        const newWidth = parseInt(widthInput.value) || 50;
        const newHeight = parseInt(heightInput.value) || 50;

        if (newWidth > 200 || newHeight > 200) {
            alert('Максимальный размер карты: 200x200');
            return;
        }

        const newMapData = [];
        const newTransportData = [];

        for (let y = 0; y < newHeight; y++) {
            const mapRow = [];
            const transportRow = [];

            for (let x = 0; x < newWidth; x++) {
                if (y < this.mapHeight && x < this.mapWidth) {
                    mapRow.push(this.mapData[y][x]);
                    transportRow.push(this.transportData[y][x]);
                } else {
                    mapRow.push(2);
                    transportRow.push(null);
                }
            }

            newMapData.push(mapRow);
            newTransportData.push(transportRow);
        }

        // Удаляем NPC за пределами новой карты
        this.npcs = this.npcs.filter(npc =>
            npc.x < newWidth && npc.y < newHeight
        );

        this.mapWidth = newWidth;
        this.mapHeight = newHeight;
        this.mapData = newMapData;
        this.transportData = newTransportData;

        this.canvas.width = this.mapWidth * this.tileSize;
        this.canvas.height = this.mapHeight * this.tileSize;
        this.selectionCanvas.width = this.canvas.width;
        this.selectionCanvas.height = this.canvas.height;
        this.gridCanvas.width = this.canvas.width;
        this.gridCanvas.height = this.canvas.height;
        this.previewCanvas.width = this.canvas.width;
        this.previewCanvas.height = this.canvas.height;

        this.render();
        this.clearPreview();
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.mapEditor = new MapEditor();
});

window.addEventListener('beforeunload', () => {
    if (window.mapEditor) {
        window.mapEditor.destroy();
    }
});