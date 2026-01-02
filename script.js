class MapEditor {
    constructor() {
        this.tileSize = 32;
        this.mapWidth = 50;
        this.mapHeight = 50;

        // Текущие выбранные объекты
        this.currentTile = 2; // Трава по умолчанию
        this.currentTransport = null;
        this.currentTrigger = null;
        this.currentStructure = null;

        // Данные карты
        this.mapData = [];
        this.transportData = [];
        this.selection = {
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            active: false
        };

        // Инструменты
        this.isDrawing = false;
        this.tool = 'brush';
        this.transportDirection = 0; // 0: вверх, 1: вправо, 2: вниз, 3: влево

        // Настройки предпросмотра
        this.showPreview = true;
        this.previewOpacity = 0.6; // 60%

        // Состояние предпросмотра
        this.previewState = {
            type: null, // 'tile', 'transport', 'trigger', 'structure'
            id: null,
            x: null,
            y: null,
            direction: 0,
            needsUpdate: false
        };

        // Анимация
        this.animationFrameId = null;

        this.init();
    }

    async init() {
        // Canvas элементы
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.selectionCanvas = document.getElementById('selectionCanvas');
        this.selectionCtx = this.selectionCanvas.getContext('2d');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.gridCtx = this.gridCanvas.getContext('2d');

        // Создаем canvas для предпросмотра
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.id = 'previewCanvas';
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCanvas.width = this.canvas.width;
        this.previewCanvas.height = this.canvas.height;
        document.querySelector('.canvas-container').appendChild(this.previewCanvas);

        // Элементы интерфейса
        this.coordinatesDisplay = document.getElementById('coordinates');
        this.toolInfoDisplay = document.getElementById('toolInfo');
        this.selectionInfoDisplay = document.getElementById('selectionInfo');
        this.objectInfoDisplay = document.getElementById('objectInfo');

        // Инициализация данных
        this.createTiles();
        this.createTransports();
        this.createTriggers();
        this.createStructures();
        this.initializeMap();
        this.setupEvents();
        this.render();

        // Создание палитр
        this.createTilePalette();
        this.createTransportPalette();
        this.createTriggersPalette();
        this.createStructuresPalette();

        this.updateToolInfo();

        // Запускаем цикл анимации для предпросмотра
        this.animationLoop();
    }

    // Цикл анимации для плавного предпросмотра
    animationLoop() {
        if (this.previewState.needsUpdate && this.showPreview) {
            this.drawPreview();
            this.previewState.needsUpdate = false;
        }

        this.animationFrameId = requestAnimationFrame(() => this.animationLoop());
    }

    // Отрисовка предпросмотра
    drawPreview() {
        // Очищаем canvas предпросмотра
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

        const { type, id, x, y, direction } = this.previewState;

        if (!type || x === null || y === null) return;

        if (type === 'structure') {
            this.drawStructurePreview();
        } else {
            this.drawSinglePreview(x, y);
        }
    }

    // Отрисовка предпросмотра для одиночных объектов (тайлы, транспорт, триггеры)
    drawSinglePreview(x, y) {
        const { type, id, direction } = this.previewState;
        let pattern = null;
        let fits = true;

        // Получаем паттерн в зависимости от типа
        switch(type) {
            case 'tile':
                if (this.tiles[id]) {
                    pattern = this.tiles[id].pattern;
                }
                break;

            case 'transport':
                if (this.transports[id]) {
                    pattern = this.transports[id].patterns[direction || 0];
                    // Транспорт занимает 1 клетку, всегда помещается
                }
                break;

            case 'trigger':
                if (this.triggers[id]) {
                    pattern = this.triggers[id].pattern;
                }
                break;
        }

        if (!pattern) return;

        // Устанавливаем прозрачность
        this.previewCtx.globalAlpha = this.previewOpacity;

        // Рисуем объект
        this.previewCtx.drawImage(
            pattern,
            x * this.tileSize,
            y * this.tileSize,
            this.tileSize,
            this.tileSize
        );

        // Восстанавливаем прозрачность
        this.previewCtx.globalAlpha = 1.0;

        // Рисуем контур
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

    // Отрисовка предпросмотра для структур
    drawStructurePreview() {
        const { id, x, y } = this.previewState;
        const structure = this.structures[id];

        if (!structure) return;

        // Проверяем, помещается ли структура
        const fits = (x + structure.width <= this.mapWidth && y + structure.height <= this.mapHeight);

        // Устанавливаем прозрачность
        this.previewCtx.globalAlpha = this.previewOpacity;

        if (fits) {
            // Рисуем все тайлы структуры
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
                                pattern = tile.patterns[0]; // Для предпросмотра используем направление по умолчанию
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

        // Восстанавливаем прозрачность
        this.previewCtx.globalAlpha = 1.0;

        // Рисуем контур структуры
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

    // Обновление состояния предпросмотра
    updatePreview(x, y) {
        if (!this.showPreview) {
            this.clearPreview();
            return;
        }

        let type = null;
        let id = null;
        let direction = this.transportDirection;

        // Определяем тип предпросмотра в зависимости от инструмента и выбранного объекта
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
        }

        // Если ничего не выбрано или инструмент не поддерживает предпросмотр
        if (!type) {
            this.clearPreview();
            return;
        }

        // Проверяем, изменилось ли состояние
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

    // Очистка предпросмотра
    clearPreview() {
        if (this.previewState.type !== null) {
            this.previewState = {
                type: null,
                id: null,
                x: null,
                y: null,
                direction: 0,
                needsUpdate: true // Нужно обновить, чтобы очистить canvas
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
            100: { name: 'Спавн игрока', color: '#ff0000', symbol: 'P' },
            101: { name: 'Спавн полиции', color: '#0000ff', symbol: 'C' },
            102: { name: 'Спавн авто', color: '#00ff00', symbol: 'A' },
            103: { name: 'Сохранение', color: '#ffff00', symbol: 'S' },
            104: { name: 'Магазин', color: '#ff00ff', symbol: 'M' },
            105: { name: 'Миссия', color: '#00ffff', symbol: 'Q' },
            106: { name: 'Триггер события', color: '#ff8800', symbol: 'E' },
            107: { name: 'Телепорт', color: '#8800ff', symbol: 'T' },
            108: { name: 'Чекпоинт', color: '#0088ff', symbol: 'C' },
            109: { name: 'Парковка', color: '#88ff00', symbol: 'P' }
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

            // Создаем паттерны для 4 направлений
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

    initializeMap() {
        this.mapData = [];
        this.transportData = [];

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

    setupEvents() {
        // Обработчики мыши
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());

        // Обработчики клавиш
        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Обработчики палитр
        document.getElementById('tilePalette').addEventListener('click', (e) => this.onPaletteClick(e));
        document.getElementById('transportPalette').addEventListener('click', (e) => this.onPaletteClick(e));
        document.getElementById('triggersPalette').addEventListener('click', (e) => this.onPaletteClick(e));
        document.getElementById('structuresPalette').addEventListener('click', (e) => this.onPaletteClick(e));

        // Кнопки инструментов
        document.getElementById('brush').addEventListener('click', () => this.setTool('brush'));
        document.getElementById('fill').addEventListener('click', () => this.setTool('fill'));
        document.getElementById('erase').addEventListener('click', () => this.setTool('erase'));
        document.getElementById('structure').addEventListener('click', () => this.setTool('structure'));
        document.getElementById('transport').addEventListener('click', () => this.setTool('transport'));
        document.getElementById('select').addEventListener('click', () => this.setTool('select'));

        // Управление транспортом
        document.getElementById('rotateLeft').addEventListener('click', () => this.rotateTransport(-1));
        document.getElementById('rotateRight').addEventListener('click', () => this.rotateTransport(1));
        document.getElementById('transportDirection').addEventListener('change', (e) => {
            this.transportDirection = parseInt(e.target.value);
            this.previewState.direction = this.transportDirection;
            this.previewState.needsUpdate = true;
        });

        // Настройки предпросмотра
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

        // Файловые операции
        document.getElementById('loadMapBtn').addEventListener('click', () => {
            document.getElementById('loadMap').click();
        });
        document.getElementById('loadMap').addEventListener('change', (e) => this.loadMap(e));
        document.getElementById('saveMap').addEventListener('click', () => this.saveMap());
        document.getElementById('exportImage').addEventListener('click', () => this.exportAsImage());
        document.getElementById('resize').addEventListener('click', () => this.resizeMap());

        // Инициализация настроек предпросмотра
        document.getElementById('previewOpacity').value = this.previewOpacity * 100;
        document.getElementById('opacityValue').textContent = Math.round(this.previewOpacity * 100) + '%';

        this.updateToolInfo();
    }

    onPaletteClick(e) {
        const item = e.target.closest('.palette-item');
        if (!item) return;

        const type = item.dataset.type;
        const id = parseInt(item.dataset.id);

        // Снимаем выделение со всех элементов
        document.querySelectorAll('.palette-item').forEach(el => {
            el.classList.remove('selected');
        });

        // Выделяем выбранный элемент
        item.classList.add('selected');

        // Устанавливаем текущий объект
        this.currentTile = null;
        this.currentTransport = null;
        this.currentTrigger = null;
        this.currentStructure = null;

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
        }

        this.updateObjectInfo();
        this.updateToolInfo();
    }

    setTool(tool) {
        this.tool = tool;

        // Обновляем кнопки инструментов
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

        // Обновляем координаты
        this.coordinatesDisplay.textContent = `X: ${pos.x}, Y: ${pos.y}`;

        // Обновляем предпросмотр
        this.updatePreview(pos.x, pos.y);

        if (this.isDrawing) {
            if (this.tool === 'select') {
                this.selection.endX = pos.x;
                this.selection.endY = pos.y;
                this.renderSelection();
            } else if (this.tool === 'brush' || this.tool === 'erase' || this.tool === 'transport') {
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
                case 'p': e.preventDefault();
                    this.showPreview = !this.showPreview;
                    document.getElementById('showPreview').checked = this.showPreview;
                    if (!this.showPreview) this.clearPreview();
                    break;
            }
        }

        // Поворот транспорта стрелками
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
        }

        this.objectInfoDisplay.textContent = info;
    }

    saveMap() {
        const map = {
            version: '4.0',
            width: this.mapWidth,
            height: this.mapHeight,
            tileSize: this.tileSize,
            mapData: this.mapData,
            transportData: this.transportData,
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
                name: this.triggers[id].name
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

        alert('Карта сохранена успешно!');
    }

    async loadMap(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const map = JSON.parse(e.target.result);

                if (map.version >= '4.0') {
                    this.mapWidth = map.width;
                    this.mapHeight = map.height;
                    this.mapData = map.mapData;
                    this.transportData = map.transportData || [];

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
                } else {
                    this.mapWidth = map.width;
                    this.mapHeight = map.height;
                    this.mapData = map.data;

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
                alert('Карта загружена успешно!');
            } catch (err) {
                console.error('Ошибка загрузки карты:', err);
                alert('Неверный формат файла карты');
            }
        };
        reader.readAsText(file);
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

    // Очистка ресурсов при уничтожении редактора
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}

// Инициализация редактора при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    window.mapEditor = new MapEditor();
});

// Очистка при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (window.mapEditor) {
        window.mapEditor.destroy();
    }
});