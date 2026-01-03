// ДОБАВЬТЕ ЭТИ КЛАССЫ В НАЧАЛЕ ФАЙЛА game.js

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

class NPC {
    constructor(id, type, x, y) {
        this.id = id;
        this.type = type; // cop, gangster, civilian, dealer, medic, driver
        this.x = x;
        this.y = y;
        this.direction = 0;
        this.speed = 0.5 + Math.random() * 0.5;
        this.health = 100;
        this.maxHealth = 100;
        this.behavior = 'idle'; // idle, patrol, chase, flee
        this.target = null;
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        this.visionRange = 5;
        this.attackRange = 1;
        this.damage = 10;
        this.attackCooldown = 0;

        // Настройки поведения по типу
        this.setupBehavior();
    }

    setupBehavior() {
        switch(this.type) {
            case 'cop':
                this.behavior = 'patrol';
                this.visionRange = 8;
                this.speed = 0.8;
                break;
            case 'gangster':
                this.behavior = 'aggressive';
                this.visionRange = 6;
                this.speed = 0.7;
                this.damage = 15;
                break;
            case 'civilian':
                this.behavior = 'idle';
                this.speed = 0.4;
                this.visionRange = 3;
                break;
            case 'dealer':
                this.behavior = 'idle';
                this.speed = 0.3;
                break;
            case 'medic':
                this.behavior = 'passive';
                this.speed = 0.5;
                break;
            case 'driver':
                this.behavior = 'patrol';
                this.speed = 1.0;
                break;
        }

        // Создаем случайные точки патрулирования
        if (this.behavior === 'patrol') {
            this.generatePatrolPoints();
        }
    }

    generatePatrolPoints() {
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            this.patrolPoints.push({
                x: this.x + (Math.random() - 0.5) * 10,
                y: this.y + (Math.random() - 0.5) * 10
            });
        }
    }

    update(deltaTime, player, mapData) {
        if (this.health <= 0) return;

        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime / 1000);

        switch(this.behavior) {
            case 'idle':
                this.updateIdle(deltaTime);
                break;
            case 'patrol':
                this.updatePatrol(deltaTime);
                break;
            case 'aggressive':
                this.updateAggressive(deltaTime, player);
                break;
            case 'chase':
                this.updateChase(deltaTime, player);
                break;
            case 'flee':
                this.updateFlee(deltaTime, player);
                break;
        }

        this.clampPosition();
    }

    updateIdle(deltaTime) {
        // Случайное движение
        if (Math.random() < 0.01) {
            this.direction = Math.random() * Math.PI * 2;
        }

        if (Math.random() < 0.8) {
            this.x += Math.cos(this.direction) * this.speed * (deltaTime / 16);
            this.y += Math.sin(this.direction) * this.speed * (deltaTime / 16);
        }
    }

    updatePatrol(deltaTime) {
        if (this.patrolPoints.length === 0) {
            this.updateIdle(deltaTime);
            return;
        }

        const target = this.patrolPoints[this.currentPatrolIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.5) {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        } else {
            this.direction = Math.atan2(dy, dx);
            this.x += Math.cos(this.direction) * this.speed * (deltaTime / 16);
            this.y += Math.sin(this.direction) * this.speed * (deltaTime / 16);
        }
    }

    updateAggressive(deltaTime, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.visionRange) {
            this.behavior = 'chase';
            this.target = player;
        } else {
            this.updateIdle(deltaTime);
        }
    }

    updateChase(deltaTime, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.visionRange * 1.5) {
            this.behavior = 'aggressive';
            this.target = null;
            return;
        }

        if (distance < this.attackRange && this.attackCooldown <= 0) {
            this.attack(player);
        } else {
            this.direction = Math.atan2(dy, dx);
            this.x += Math.cos(this.direction) * this.speed * (deltaTime / 16);
            this.y += Math.sin(this.direction) * this.speed * (deltaTime / 16);
        }
    }

    updateFlee(deltaTime, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.visionRange * 2) {
            this.behavior = 'idle';
            return;
        }

        // Бежим от игрока
        this.direction = Math.atan2(dy, dx) + Math.PI;
        this.x += Math.cos(this.direction) * this.speed * 1.5 * (deltaTime / 16);
        this.y += Math.sin(this.direction) * this.speed * 1.5 * (deltaTime / 16);
    }

    attack(target) {
        if (this.attackCooldown > 0) return;

        target.health -= this.damage;
        this.attackCooldown = 1.0; // 1 секунда перезарядки

        // Эффект попадания
        console.log(`${this.type} атаковал игрока!`);
    }

    takeDamage(amount) {
        this.health -= amount;

        if (this.health > 0) {
            // При получении урона меняем поведение
            if (this.behavior === 'idle' || this.behavior === 'patrol') {
                this.behavior = 'flee';
            }
        }
    }

    clampPosition() {
        // В реальной игре нужно проверять коллизии с картой
        this.x = Math.max(0, Math.min(this.x, 50));
        this.y = Math.max(0, Math.min(this.y, 50));
    }

    render(ctx, camera, tileSize) {
        if (this.health <= 0) return;

        const x = this.x * tileSize - camera.x;
        const y = this.y * tileSize - camera.y;

        // Цвет по типу NPC
        let color;
        switch(this.type) {
            case 'cop': color = '#0000ff'; break;
            case 'gangster': color = '#ff0000'; break;
            case 'civilian': color = '#00ff00'; break;
            case 'dealer': color = '#ffff00'; break;
            case 'medic': color = '#ffffff'; break;
            case 'driver': color = '#ff8800'; break;
            default: color = '#888888';
        }

        // Рисуем NPC
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
            x + tileSize / 2,
            y + tileSize / 2,
            tileSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Рисуем здоровье
        const barWidth = tileSize;
        const barHeight = 4;

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y - 10, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x, y - 10, barWidth * (this.health / this.maxHealth), barHeight);

        // Рисуем направление
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + tileSize / 2, y + tileSize / 2);
        ctx.lineTo(
            x + tileSize / 2 + Math.cos(this.direction) * (tileSize / 2),
            y + tileSize / 2 + Math.sin(this.direction) * (tileSize / 2)
        );
        ctx.stroke();
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            health: this.health,
            behavior: this.behavior
        };
    }

    static fromJSON(data) {
        const npc = new NPC(data.id, data.type, data.x, data.y);
        npc.health = data.health;
        npc.behavior = data.behavior;
        return npc;
    }
}

class Vehicle {
    constructor(id, type, x, y, direction) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = 0;
        this.maxSpeed = 5;
        this.health = 100;
        this.isOccupied = false;
        this.occupant = null;
    }

    update(deltaTime) {
        if (this.isOccupied && this.speed < this.maxSpeed) {
            this.speed += 0.1 * (deltaTime / 16);
        } else if (!this.isOccupied && this.speed > 0) {
            this.speed -= 0.05 * (deltaTime / 16);
        }

        this.x += Math.cos(this.direction) * this.speed * (deltaTime / 16);
        this.y += Math.sin(this.direction) * this.speed * (deltaTime / 16);
    }

    render(ctx, camera, tileSize) {
        const x = this.x * tileSize - camera.x;
        const y = this.y * tileSize - camera.y;

        ctx.fillStyle = '#ff8800';
        ctx.fillRect(x, y, tileSize, tileSize);

        // Рисуем направление
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + tileSize / 2, y + tileSize / 2);
        ctx.lineTo(
            x + tileSize / 2 + Math.cos(this.direction) * (tileSize / 2),
            y + tileSize / 2 + Math.sin(this.direction) * (tileSize / 2)
        );
        ctx.stroke();
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            direction: this.direction,
            health: this.health
        };
    }

    static fromJSON(data) {
        const vehicle = new Vehicle(data.id, data.type, data.x, data.y, data.direction);
        vehicle.health = data.health;
        return vehicle;
    }
}

// ТЕПЕРЬ ОСНОВНОЙ КЛАСС ИГРЫ
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.gameState = 'loading';
        this.tileSize = 32;
        this.mapData = null;
        this.transportData = null;
        this.npcs = [];
        this.missionManager = null;

        this.player = {
            x: 0,
            y: 0,
            direction: 0,
            health: 100,
            maxHealth: 100,
            armor: 0,
            maxArmor: 100,
            money: 0,
            experience: 0,
            inventory: [],
            weapons: [],
            currentWeapon: null,
            speed: 3,
            isInVehicle: false,
            currentVehicle: null
        };

        this.camera = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };

        this.vehicles = [];
        this.projectiles = [];
        this.particles = [];

        this.keys = {};
        this.mouse = { x: 0, y: 0, buttons: {} };

        this.currentMission = null;
        this.activeMissions = [];

        this.isPaused = false;
        this.lastTime = 0;
        this.fps = 0;

        this.tiles = {};
        this.transports = {};
        this.triggers = {};
        this.structures = {};

        this.loadMapData();
        this.setupEventListeners();
        this.resizeCanvas();
    }

    async loadMapData() {
        const loadingBar = document.getElementById('loadingBar');
        const loadingText = document.getElementById('loadingText');

        try {
            loadingText.textContent = 'Загрузка сохраненной карты...';
            loadingBar.style.width = '20%';

            // Попробуем загрузить последнюю сохраненную карту
            const savedMap = localStorage.getItem('lastEditedMap');
            if (savedMap) {
                await this.loadFromJSON(JSON.parse(savedMap));
            } else {
                // Или создадим тестовую карту
                await this.createTestMap();
            }

            loadingBar.style.width = '100%';
            loadingText.textContent = 'Загрузка завершена!';

            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
                this.gameState = 'playing';
                this.gameLoop(0);
            }, 500);

        } catch (error) {
            console.error('Ошибка загрузки:', error);
            loadingText.textContent = 'Ошибка загрузки. Создание тестовой карты...';
            await this.createTestMap();

            loadingBar.style.width = '100%';
            document.getElementById('loadingScreen').style.display = 'none';
            this.gameState = 'playing';
            this.gameLoop(0);
        }
    }

    async loadFromJSON(mapData) {
        this.mapWidth = mapData.width;
        this.mapHeight = mapData.height;
        this.tileSize = mapData.tileSize || 32;
        this.mapData = mapData.mapData;
        this.transportData = mapData.transportData || [];

        // Загружаем миссии
        if (mapData.missions) {
            this.missionManager = MissionManager.fromJSON(mapData.missions);
        } else {
            this.missionManager = new MissionManager();
        }

        // Инициализируем игрока
        this.findPlayerSpawn();

        // Загружаем NPC из данных карты
        if (mapData.npcs) {
            this.npcs = mapData.npcs.map(npcData => NPC.fromJSON(npcData));
        } else {
            this.createTestNPCs();
        }

        // Загружаем транспорт
        if (mapData.vehicles) {
            this.vehicles = mapData.vehicles.map(vehicleData => Vehicle.fromJSON(vehicleData));
        }

        this.resizeCanvas();

        // Создаем текстуры для тайлов
        await this.createTextures();
    }

    createTestMap() {
        this.mapWidth = 50;
        this.mapHeight = 50;
        this.mapData = [];
        this.transportData = [];

        // Создаем базовую карту
        for (let y = 0; y < this.mapHeight; y++) {
            const row = [];
            const transportRow = [];
            for (let x = 0; x < this.mapWidth; x++) {
                // Создаем дорогу по центру
                if (y === Math.floor(this.mapHeight / 2)) {
                    row.push(1); // Асфальт
                } else if (Math.abs(y - Math.floor(this.mapHeight / 2)) <= 1) {
                    row.push(3); // Тротуар
                } else {
                    row.push(2); // Трава
                }
                transportRow.push(null);
            }
            this.mapData.push(row);
            this.transportData.push(transportRow);
        }

        // Добавляем здания
        for (let y = 10; y < 15; y++) {
            for (let x = 10; x < 20; x++) {
                this.mapData[y][x] = 4; // Стены
            }
        }

        for (let x = 10; x < 20; x++) {
            this.mapData[9][x] = 5; // Крыша
        }

        // Добавляем деревья
        this.mapData[5][5] = 6;
        this.mapData[7][8] = 6;
        this.mapData[12][25] = 6;

        // Добавляем триггер спавна игрока
        const centerX = Math.floor(this.mapWidth / 2);
        const centerY = Math.floor(this.mapHeight / 2);
        this.mapData[centerY][centerX] = 100;

        // Создаем менеджер миссий
        this.missionManager = new MissionManager();

        // Создаем тестовую миссию
        const testMission = new Mission(1, "Первая миссия", "Найдите аптечку");
        testMission.startTrigger = 100;
        testMission.addTargetTrigger(112, 1); // Сбор предмета
        testMission.rewards.money = 1000;
        this.missionManager.addMission(testMission);

        // Создаем тестовых NPC
        this.createTestNPCs();

        this.findPlayerSpawn();
        this.resizeCanvas();

        // Создаем текстуры
        this.createTextures();
    }

    createTestNPCs() {
        this.npcs = [
            new NPC(1, 'cop', Math.floor(this.mapWidth / 2) + 5, Math.floor(this.mapHeight / 2)),
            new NPC(2, 'gangster', Math.floor(this.mapWidth / 2) + 10, Math.floor(this.mapHeight / 2) + 5),
            new NPC(3, 'civilian', Math.floor(this.mapWidth / 2) - 5, Math.floor(this.mapHeight / 2) - 5),
            new NPC(4, 'dealer', Math.floor(this.mapWidth / 2) + 15, Math.floor(this.mapHeight / 2)),
            new NPC(5, 'medic', Math.floor(this.mapWidth / 2) - 10, Math.floor(this.mapHeight / 2) + 10)
        ];
    }

    async createTextures() {
        // Создаем текстуры для тайлов (упрощенная версия из редактора)
        this.tiles = {
            0: this.createTileTexture('#1a1a1a'),
            1: this.createTileTexture('#333333'),
            2: this.createTileTexture('#2d5a27'),
            3: this.createTileTexture('#888888'),
            4: this.createTileTexture('#555555'),
            5: this.createTileTexture('#444444'),
            6: this.createTileTexture('#1e3a1e'),
            7: this.createTileTexture('#1a5a8a'),
            8: this.createTileTexture('#ffff00'),
            9: this.createTileTexture('#c2b280'),
            10: this.createTileTexture('#8b6b42'),
            11: this.createTileTexture('#88ccff'),
            12: this.createTileTexture('#8b7355'),
            13: this.createTileTexture('#666666')
        };

        // Текстуры для триггеров
        this.triggers = {
            100: this.createTriggerTexture('#ff0000', 'P'),
            101: this.createTriggerTexture('#0000ff', 'C'),
            102: this.createTriggerTexture('#00ff00', 'A'),
            103: this.createTriggerTexture('#ffff00', 'S'),
            104: this.createTriggerTexture('#ff00ff', 'M'),
            105: this.createTriggerTexture('#00ffff', 'Q'),
            106: this.createTriggerTexture('#ff8800', 'E'),
            107: this.createTriggerTexture('#8800ff', 'T'),
            108: this.createTriggerTexture('#0088ff', 'C'),
            109: this.createTriggerTexture('#88ff00', 'P'),
            110: this.createTriggerTexture('#00ff00', '🚩'),
            111: this.createTriggerTexture('#ff0000', '🏁'),
            112: this.createTriggerTexture('#ffff00', '📦'),
            113: this.createTriggerTexture('#00ffff', '💬'),
            114: this.createTriggerTexture('#ff00ff', '🚪'),
            115: this.createTriggerTexture('#ff8800', '🔧'),
            116: this.createTriggerTexture('#ff0000', '🎯'),
            117: this.createTriggerTexture('#0000ff', '🛡️'),
            118: this.createTriggerTexture('#ff8800', '🏃'),
            119: this.createTriggerTexture('#888888', '⏳'),
            120: this.createTriggerTexture('#00ff00', '👥')
        };
    }

    createTileTexture(color) {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.tileSize, this.tileSize);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, this.tileSize - 1, this.tileSize - 1);

        return canvas;
    }

    createTriggerTexture(color, symbol) {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = color;
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
        ctx.fillText(symbol, this.tileSize / 2, this.tileSize / 2);

        return canvas;
    }

    findPlayerSpawn() {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.mapData[y][x] === 100) { // ID триггера спавна игрока
                    this.player.x = x;
                    this.player.y = y;
                    this.camera.x = x * this.tileSize - this.canvas.width / 2;
                    this.camera.y = y * this.tileSize - this.canvas.height / 2;
                    return;
                }
            }
        }

        // Если не нашли спавн, используем центр карты
        this.player.x = Math.floor(this.mapWidth / 2);
        this.player.y = Math.floor(this.mapHeight / 2);
        this.camera.x = this.player.x * this.tileSize - this.canvas.width / 2;
        this.camera.y = this.player.y * this.tileSize - this.canvas.height / 2;
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;

        this.clampCamera();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            if (e.key === 'Escape') {
                this.togglePause();
            }

            if (e.key === 'i' && !this.isPaused) {
                this.toggleInventory();
            }

            if (e.key === 'Tab' && !this.isPaused) {
                e.preventDefault();
                this.showMissionSelect();
            }

            // Быстрое сохранение/загрузка
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveGame();
            }

            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.loadGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left + this.camera.x;
            this.mouse.y = e.clientY - rect.top + this.camera.y;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.buttons[e.button] = true;

            if (e.button === 0 && !this.isPaused) { // Левая кнопка мыши
                this.playerAttack();
            }

            if (e.button === 2 && !this.isPaused) { // Правая кнопка мыши
                this.playerInteract();
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.mouse.buttons[e.button] = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Обработчики для меню паузы
        document.getElementById('resumeGame').addEventListener('click', () => this.togglePause());
        document.getElementById('saveGame').addEventListener('click', () => this.saveGame());
        document.getElementById('loadGame').addEventListener('click', () => this.loadGame());
        document.getElementById('quitGame').addEventListener('click', () => this.quitToEditor());

        // Предотвращаем прокрутку страницы при игре
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                if (document.activeElement === document.body) {
                    e.preventDefault();
                }
            }
        }, false);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseMenu').style.display = this.isPaused ? 'flex' : 'none';
    }

    toggleInventory() {
        const inventory = document.getElementById('inventory');
        inventory.style.display = inventory.style.display === 'none' ? 'block' : 'none';
        this.updateInventory();
    }

    updateInventory() {
        const inventory = document.getElementById('inventory');
        inventory.innerHTML = '<h3>Инвентарь</h3>';

        if (this.player.inventory.length === 0) {
            inventory.innerHTML += '<p>Инвентарь пуст</p>';
            return;
        }

        this.player.inventory.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.textContent = `${item.name} x${item.quantity}`;
            inventory.appendChild(itemDiv);
        });
    }

    showMissionSelect() {
        const availableMissions = this.missionManager.getAvailableMissions();

        if (availableMissions.length === 0) {
            this.showMessage('Нет доступных миссий');
            return;
        }

        // В реальной игре можно сделать UI для выбора миссии
        const mission = availableMissions[0];
        this.startMission(mission.id);
    }

    startMission(missionId) {
        const mission = this.missionManager.startMission(missionId);
        if (!mission) return;

        this.currentMission = mission;
        this.updateMissionUI();

        // Показываем маркеры на карте
        this.showMissionMarkers(mission);
    }

    updateMissionUI() {
        if (!this.currentMission) {
            document.getElementById('missionInfo').style.display = 'none';
            return;
        }

        const missionInfo = document.getElementById('missionInfo');
        missionInfo.style.display = 'block';

        document.getElementById('missionTitle').textContent = this.currentMission.name;
        document.getElementById('missionDesc').textContent = this.currentMission.description;

        let objectivesText = '';
        if (this.currentMission.targetTriggers.length > 0) {
            this.currentMission.targetTriggers.forEach(target => {
                objectivesText += `• Собрать: ${target.collectedCount}/${target.requiredCount}<br>`;
            });
        }

        if (this.currentMission.objectives.length > 0) {
            this.currentMission.objectives.forEach(obj => {
                objectivesText += `• ${obj.description}: ${obj.completed ? '✓' : '✗'}<br>`;
            });
        }

        document.getElementById('missionObjectives').innerHTML = objectivesText;

        if (this.currentMission.timeLimit > 0) {
            document.getElementById('missionTimer').textContent =
                `Время: ${Math.floor(this.currentMission.timeLimit)} сек`;
        }
    }

    showMissionMarkers(mission) {
        // В реальной игре можно добавить маркеры на мини-карту
        console.log('Миссия началась:', mission.name);
    }

    playerAttack() {
        if (this.player.currentWeapon) {
            this.shootProjectile();
        } else {
            this.punch();
        }
    }

    playerInteract() {
        const playerTileX = Math.floor(this.player.x);
        const playerTileY = Math.floor(this.player.y);

        // Проверяем триггеры вокруг игрока
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = playerTileX + dx;
                const y = playerTileY + dy;

                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                    const tileId = this.mapData[y][x];

                    if (tileId >= 100 && this.triggers[tileId]) {
                        this.handleTrigger(tileId, x, y);
                    }
                }
            }
        }

        // Проверяем NPC вокруг игрока
        this.npcs.forEach(npc => {
            const distance = Math.sqrt(
                Math.pow(npc.x - this.player.x, 2) +
                Math.pow(npc.y - this.player.y, 2)
            );

            if (distance < 1.5) {
                this.interactWithNPC(npc);
            }
        });
    }

    handleTrigger(triggerId, x, y) {
        const triggerTypes = {
            100: () => console.log('Спавн игрока'),
            103: () => this.saveGame(),
            104: () => this.openShop(),
            105: () => this.handleMissionTrigger(triggerId),
            106: () => this.triggerEvent(),
            107: () => this.teleport(x, y),
            108: () => this.setCheckpoint(x, y),
            109: () => this.parkVehicle(),
            110: () => this.startMissionTrigger(triggerId),
            111: () => this.endMissionTrigger(triggerId),
            112: () => this.collectItem(triggerId),
            113: () => this.startDialog(triggerId),
            114: () => this.transitionMap(),
            115: () => this.activateObject(),
            116: () => this.destroyTarget(),
            117: () => this.defendPoint(),
            118: () => this.escape(),
            119: () => this.wait(),
            120: () => this.escort()
        };

        if (triggerTypes[triggerId]) {
            triggerTypes[triggerId]();
        }
    }

    handleMissionTrigger(triggerId) {
        if (this.currentMission) {
            // Проверяем, является ли этот триггер целью миссии
            const target = this.currentMission.targetTriggers.find(t => t.triggerId === triggerId);
            if (target) {
                this.missionManager.collectTrigger(triggerId);
                this.updateMissionUI();

                if (this.currentMission.status === 'completed') {
                    this.completeCurrentMission();
                }
            }
        }
    }

    completeCurrentMission() {
        if (!this.currentMission) return;

        const rewards = this.currentMission.rewards;

        this.player.money += rewards.money;
        this.player.experience += rewards.experience;

        rewards.items.forEach(item => {
            this.addToInventory(item.itemId, item.quantity);
        });

        this.showMessage(`Миссия выполнена! Награда: $${rewards.money}, ${rewards.experience} опыта`);
        this.updatePlayerStats();

        this.currentMission = null;
        document.getElementById('missionInfo').style.display = 'none';
    }

    addToInventory(itemId, quantity) {
        const item = this.missionManager.items[itemId];
        if (!item) return;

        const existingItem = this.player.inventory.find(i => i.id === itemId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.player.inventory.push({
                id: itemId,
                name: item.name,
                type: item.type,
                quantity: quantity,
                value: item.value
            });
        }
    }

    interactWithNPC(npc) {
        if (npc.type === 'dealer') {
            this.openShop();
        } else if (npc.type === 'medic') {
            this.healPlayer();
        } else {
            this.startNPCDialog(npc);
        }
    }

    startNPCDialog(npc) {
        // Находим связанные диалоги с этим NPC
        if (this.currentMission && this.currentMission.dialogs) {
            const dialog = this.currentMission.dialogs.find(d =>
                d.character.toLowerCase().includes(npc.type)
            );

            if (dialog) {
                this.showDialog(dialog);
            }
        }
    }

    showDialog(dialog) {
        const dialogBox = document.getElementById('dialogBox');
        dialogBox.style.display = 'block';
        dialogBox.innerHTML = '';

        const characterDiv = document.createElement('div');
        characterDiv.className = 'dialog-character';
        characterDiv.textContent = dialog.character;
        dialogBox.appendChild(characterDiv);

        const textDiv = document.createElement('div');
        textDiv.className = 'dialog-text';
        textDiv.textContent = dialog.text;
        dialogBox.appendChild(textDiv);

        if (dialog.options && dialog.options.length > 0) {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'dialog-options';

            dialog.options.forEach(option => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'dialog-option';
                optionDiv.textContent = option.text;
                optionDiv.addEventListener('click', () => {
                    if (option.next) {
                        // Находим следующий диалог
                        const nextDialog = this.currentMission.dialogs.find(d => d.id === option.next);
                        if (nextDialog) {
                            this.showDialog(nextDialog);
                        } else {
                            dialogBox.style.display = 'none';
                        }
                    } else {
                        dialogBox.style.display = 'none';

                        // Активируем триггер после диалога, если есть
                        if (dialog.trigger) {
                            this.handleTrigger(dialog.trigger);
                        }
                    }
                });
                optionsDiv.appendChild(optionDiv);
            });

            dialogBox.appendChild(optionsDiv);
        } else {
            const closeButton = document.createElement('div');
            closeButton.className = 'dialog-option';
            closeButton.textContent = 'Продолжить';
            closeButton.addEventListener('click', () => {
                dialogBox.style.display = 'none';
                if (dialog.trigger) {
                    this.handleTrigger(dialog.trigger);
                }
            });
            dialogBox.appendChild(closeButton);
        }
    }

    shootProjectile() {
        if (!this.player.currentWeapon) return;

        const projectile = {
            x: this.player.x,
            y: this.player.y,
            dx: Math.cos(this.player.direction) * 10,
            dy: Math.sin(this.player.direction) * 10,
            damage: this.player.currentWeapon.damage,
            lifetime: 60,
            color: '#ffff00'
        };

        this.projectiles.push(projectile);
    }

    punch() {
        // Простая атака в ближнем бою
        const attackRange = 1.5;

        this.npcs.forEach(npc => {
            const distance = Math.sqrt(
                Math.pow(npc.x - this.player.x, 2) +
                Math.pow(npc.y - this.player.y, 2)
            );

            if (distance < attackRange) {
                npc.takeDamage(10);

                if (npc.health <= 0) {
                    this.onNPCDeath(npc);
                }
            }
        });
    }

    onNPCDeath(npc) {
        // Дроп предметов при смерти NPC
        if (Math.random() > 0.7) {
            this.spawnItem(npc.x, npc.y, 'money_small');
        }

        // Удаляем NPC из массива
        const index = this.npcs.indexOf(npc);
        if (index > -1) {
            this.npcs.splice(index, 1);
        }
    }

    spawnItem(x, y, itemId) {
        // В реальной игре можно добавить предметы на карту
        console.log(`Предмет ${itemId} появился на ${x}, ${y}`);
    }

    updatePlayerStats() {
        document.getElementById('health').textContent = Math.floor(this.player.health);
        document.getElementById('armor').textContent = Math.floor(this.player.armor);
        document.getElementById('money').textContent = this.player.money;
        document.getElementById('exp').textContent = this.player.experience;
    }

    showMessage(message) {
        // Временное сообщение в UI
        const messageDiv = document.createElement('div');
        messageDiv.style.position = 'absolute';
        messageDiv.style.top = '50%';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translate(-50%, -50%)';
        messageDiv.style.background = 'rgba(0, 0, 0, 0.8)';
        messageDiv.style.color = 'white';
        messageDiv.style.padding = '10px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.zIndex = '1000';
        messageDiv.textContent = message;

        document.getElementById('ui').appendChild(messageDiv);

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    saveGame() {
        const saveData = {
            player: this.player,
            npcs: this.npcs.map(npc => npc.toJSON()),
            vehicles: this.vehicles.map(vehicle => vehicle.toJSON()),
            missionManager: this.missionManager.toJSON(),
            timestamp: Date.now()
        };

        localStorage.setItem('gameSave', JSON.stringify(saveData));
        this.showMessage('Игра сохранена!');
    }

    loadGame() {
        const saveData = localStorage.getItem('gameSave');
        if (!saveData) {
            this.showMessage('Нет сохраненных игр');
            return;
        }

        try {
            const data = JSON.parse(saveData);

            this.player = data.player;
            this.npcs = data.npcs.map(npc => NPC.fromJSON(npc));
            this.vehicles = data.vehicles.map(vehicle => Vehicle.fromJSON(vehicle));
            this.missionManager = MissionManager.fromJSON(data.missionManager);

            this.updatePlayerStats();
            this.showMessage('Игра загружена!');
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            this.showMessage('Ошибка загрузки сохранения');
        }
    }

    quitToEditor() {
        if (confirm('Вернуться в редактор? Прогресс будет сохранен.')) {
            this.saveGame();
            window.location.href = 'index.html';
        }
    }

    gameLoop(timestamp) {
        if (this.gameState !== 'playing') return;

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.fps = 1000 / deltaTime;

        if (!this.isPaused) {
            this.update(deltaTime);
        }

        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        // Обновление игрока
        this.updatePlayer(deltaTime);

        // Обновление NPC
        this.npcs.forEach(npc => npc.update(deltaTime, this.player, this.mapData));

        // Обновление транспорта
        this.vehicles.forEach(vehicle => vehicle.update(deltaTime));

        // Обновление снарядов
        this.updateProjectiles(deltaTime);

        // Обновление частиц
        this.updateParticles(deltaTime);

        // Обновление камеры
        this.updateCamera();

        // Обновление миссий
        if (this.currentMission && this.currentMission.timeLimit > 0) {
            this.currentMission.timeLimit -= deltaTime / 1000;
            if (this.currentMission.timeLimit <= 0) {
                this.failCurrentMission();
            }
            this.updateMissionUI();
        }

        // Обновление мини-карты
        this.updateMinimap();
    }

    updatePlayer(deltaTime) {
        const speed = this.player.speed * (deltaTime / 16);

        let dx = 0;
        let dy = 0;

        if (this.keys['w'] || this.keys['arrowup']) dy -= speed;
        if (this.keys['s'] || this.keys['arrowdown']) dy += speed;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= speed;
        if (this.keys['d'] || this.keys['arrowright']) dx += speed;

        // Нормализуем диагональное движение
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        // Обновляем направление
        if (dx !== 0 || dy !== 0) {
            this.player.direction = Math.atan2(dy, dx);
        }

        // Проверяем коллизии
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        if (this.canMoveTo(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
        } else if (this.canMoveTo(newX, this.player.y)) {
            this.player.x = newX;
        } else if (this.canMoveTo(this.player.x, newY)) {
            this.player.y = newY;
        }

        // Обновляем статистику
        this.updatePlayerStats();
    }

    canMoveTo(x, y) {
        // Проверяем границы карты
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
            return false;
        }

        // Проверяем проходимость тайлов
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        // Непроходимые тайлы
        const impassableTiles = [4, 6, 7, 13]; // Стены, деревья, вода, решетки

        if (impassableTiles.includes(this.mapData[tileY][tileX])) {
            return false;
        }

        return true;
    }

    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];

            projectile.x += projectile.dx * (deltaTime / 16);
            projectile.y += projectile.dy * (deltaTime / 16);
            projectile.lifetime--;

            // Проверяем попадание в NPC
            for (const npc of this.npcs) {
                const distance = Math.sqrt(
                    Math.pow(projectile.x - npc.x, 2) +
                    Math.pow(projectile.y - npc.y, 2)
                );

                if (distance < 0.5) {
                    npc.takeDamage(projectile.damage);
                    this.createHitEffect(projectile.x, projectile.y);

                    if (npc.health <= 0) {
                        this.onNPCDeath(npc);
                    }

                    this.projectiles.splice(i, 1);
                    break;
                }
            }

            // Проверяем границы карты
            if (projectile.x < 0 || projectile.x >= this.mapWidth ||
                projectile.y < 0 || projectile.y >= this.mapHeight ||
                projectile.lifetime <= 0) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    createHitEffect(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x,
                y: y,
                dx: (Math.random() - 0.5) * 2,
                dy: (Math.random() - 0.5) * 2,
                life: 20,
                color: '#ff4444'
            });
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            particle.x += particle.dx * (deltaTime / 16);
            particle.y += particle.dy * (deltaTime / 16);
            particle.life--;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateCamera() {
        // Плавное следование камеры за игроком
        const targetX = this.player.x * this.tileSize - this.canvas.width / 2;
        const targetY = this.player.y * this.tileSize - this.canvas.height / 2;

        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;

        this.clampCamera();
    }

    clampCamera() {
        const maxX = this.mapWidth * this.tileSize - this.canvas.width;
        const maxY = this.mapHeight * this.tileSize - this.canvas.height;

        this.camera.x = Math.max(0, Math.min(this.camera.x, maxX));
        this.camera.y = Math.max(0, Math.min(this.camera.y, maxY));
    }

    updateMinimap() {
        const ctx = this.minimapCtx;
        const size = this.minimapCanvas.width;
        const scale = size / Math.max(this.mapWidth, this.mapHeight);

        // Очищаем мини-карту
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        // Рисуем тайлы
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tileId = this.mapData[y][x];

                if (tileId === 0) {
                    ctx.fillStyle = '#1a1a1a';
                } else if (tileId === 1) {
                    ctx.fillStyle = '#333333';
                } else if (tileId === 2) {
                    ctx.fillStyle = '#2d5a27';
                } else if (tileId === 3) {
                    ctx.fillStyle = '#888888';
                } else if (tileId === 4) {
                    ctx.fillStyle = '#555555';
                } else if (tileId === 5) {
                    ctx.fillStyle = '#444444';
                } else if (tileId === 6) {
                    ctx.fillStyle = '#1e3a1e';
                } else if (tileId === 7) {
                    ctx.fillStyle = '#1a5a8a';
                } else if (tileId === 8) {
                    ctx.fillStyle = '#ffff00';
                } else {
                    ctx.fillStyle = '#2d5a27';
                }

                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }

        // Рисуем NPC
        ctx.fillStyle = '#ff0000';
        this.npcs.forEach(npc => {
            ctx.beginPath();
            ctx.arc(
                npc.x * scale,
                npc.y * scale,
                scale * 0.8,
                0,
                Math.PI * 2
            );
            ctx.fill();
        });

        // Рисуем игрока
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(
            this.player.x * scale,
            this.player.y * scale,
            scale * 1.2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    render() {
        const ctx = this.ctx;

        // Очищаем канвас
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем карту
        this.renderMap();

        // Рисуем NPC
        this.npcs.forEach(npc => npc.render(ctx, this.camera, this.tileSize));

        // Рисуем транспорт
        this.vehicles.forEach(vehicle => vehicle.render(ctx, this.camera, this.tileSize));

        // Рисуем снаряды
        this.renderProjectiles();

        // Рисуем частицы
        this.renderParticles();

        // Рисуем игрока
        this.renderPlayer();

        // Рисуем дебаг информацию (по желанию)
        if (this.keys['f3']) {
            this.renderDebugInfo();
        }
    }

    renderMap() {
        const ctx = this.ctx;
        const startX = Math.floor(this.camera.x / this.tileSize);
        const startY = Math.floor(this.camera.y / this.tileSize);
        const endX = Math.ceil((this.camera.x + this.canvas.width) / this.tileSize);
        const endY = Math.ceil((this.camera.y + this.canvas.height) / this.tileSize);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                    const tileId = this.mapData[y][x];

                    if (this.tiles[tileId]) {
                        ctx.drawImage(
                            this.tiles[tileId],
                            x * this.tileSize - this.camera.x,
                            y * this.tileSize - this.camera.y
                        );
                    } else if (this.triggers[tileId]) {
                        ctx.drawImage(
                            this.triggers[tileId],
                            x * this.tileSize - this.camera.x,
                            y * this.tileSize - this.camera.y
                        );
                    }
                }
            }
        }
    }

    renderPlayer() {
        const ctx = this.ctx;
        const x = this.player.x * this.tileSize - this.camera.x;
        const y = this.player.y * this.tileSize - this.camera.y;

        // Рисуем игрока
        ctx.fillStyle = this.player.isInVehicle ? '#ff8800' : '#00ff00';
        ctx.beginPath();
        ctx.arc(
            x + this.tileSize / 2,
            y + this.tileSize / 2,
            this.tileSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Рисуем направление
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + this.tileSize / 2, y + this.tileSize / 2);
        ctx.lineTo(
            x + this.tileSize / 2 + Math.cos(this.player.direction) * (this.tileSize / 2),
            y + this.tileSize / 2 + Math.sin(this.player.direction) * (this.tileSize / 2)
        );
        ctx.stroke();

        // Рисуем здоровье и броню
        const barWidth = this.tileSize;
        const barHeight = 4;

        // Здоровье
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y - 10, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x, y - 10, barWidth * (this.player.health / this.player.maxHealth), barHeight);

        // Броня
        if (this.player.armor > 0) {
            ctx.fillStyle = '#555555';
            ctx.fillRect(x, y - 5, barWidth, barHeight);
            ctx.fillStyle = '#0077ff';
            ctx.fillRect(x, y - 5, barWidth * (this.player.armor / this.player.maxArmor), barHeight);
        }
    }

    renderProjectiles() {
        const ctx = this.ctx;

        this.projectiles.forEach(projectile => {
            ctx.fillStyle = projectile.color;
            ctx.beginPath();
            ctx.arc(
                projectile.x * this.tileSize - this.camera.x,
                projectile.y * this.tileSize - this.camera.y,
                3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        });
    }

    renderParticles() {
        const ctx = this.ctx;

        this.particles.forEach(particle => {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life / 20;
            ctx.beginPath();
            ctx.arc(
                particle.x * this.tileSize - this.camera.x,
                particle.y * this.tileSize - this.camera.y,
                2,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }

    renderDebugInfo() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 100);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';

        ctx.fillText(`FPS: ${Math.round(this.fps)}`, 20, 30);
        ctx.fillText(`Позиция: ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`, 20, 50);
        ctx.fillText(`Камера: ${Math.floor(this.camera.x)}, ${Math.floor(this.camera.y)}`, 20, 70);
        ctx.fillText(`NPC: ${this.npcs.length}`, 20, 90);
        ctx.fillText(`Миссия: ${this.currentMission ? this.currentMission.name : 'Нет'}`, 20, 110);
    }
}

// Запуск игры при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});