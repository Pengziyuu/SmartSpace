var chart;
var option;

var polygon1 = [];
var polygon2 = [];
var polygon3 = [];

function init(centerCoord) {
    //設定Mapbox的取用Token。
    mapboxgl.accessToken = 'pk.eyJ1IjoiYmlhYm9ibyIsImEiOiJjamVvejdlNXQxZnBuMndtdWhiZHRuaTNpIn0.PIS9wtUxm_rz_IzF2WFD1g';
    chart = echarts.init(document.getElementById('map'));

    //設定echarts載入mapbox的參數值
    option = {
        mapbox3D: {
            style: 'mapbox://styles/biabobo/cjha51jt70x802rqsorws3xqz',
            center: [centerCoord[1], centerCoord[0]],
            zoom: 15,
            pitch: 60,
            altitudeScale: 1,
            shading: 'color',
            postEffect: {
                enable: true,
                SSAO: {
                    enable: true,
                    radius: 2
                }
            },
            light: {
                main: {
                    intensity: 1,
                    shadow: true,
                    shadowQuality: 'high'
                },
                ambient: {
                    intensity: 0.
                }
            }
        },
        //建立視覺對應顏色規則
        visualMap: {
            type: 'piecewise',
            pieces: [{
                gte: 150.5,
                label: '>= 150.5 μg/m3',
                color: '#660499',
                colorAlpha: 1
            }, {
                gt: 55.5,
                lt: 150.4,
                label: '55.5-150.4 μg/m3',
                color: '#CC0233',
                colorAlpha: 0.8
            }, {
                gt: 35.5,
                lt: 55.4,
                label: '35.5-55.4 μg/m3',
                color: '#FFA500',
                colorAlpha: 0.4
            }, {
                gt: 12.1,
                lte: 35.4,
                label: '12.1-35.4 μg/m3',
                color: '#FFDE34',
                colorAlpha: 0.2
            }, {
                lte: 12,
                label: '<= 12.0 μg/m3',
                color: '#009966',
                colorAlpha: 0.1
            }],
            dimension: 3,
            seriesIndex: [0, 1],
            itemWidth: 36,
            itemHeight: 26,
            itemGap: 16,
            hoverLink: false,
            left: 20,
            bottom: 50,
            fontSize: 16,
            textStyle: {
                'color': 'white',
                'fontSize': 16
            }
        }
    };
}

//載入每個數據點
function loadScatterFlightPlanPath(data) {
    chart.setOption({
        series: [{
            name: 'Flight Path Point',
            id: 'Flight Path Point',
            type: 'scatter3D',
            coordinateSystem: 'mapbox3D',
            symbol: 'circle',
            symbolSize: 8,
            animation: false,
            data: data,
            label: {
                show: false
            },
            emphasis: {
                itemStyle: {
                    borderWidth: 0.3,
                    borderColor: 'white'
                }
            }
        }]
    });
}

//建立要餵入echarts的3D資料格式
function create3dFlightPointData(datas) {
    var processDatas = {}
    for (var i = 0; i < datas.length; i++) {
        var height = datas[i][2];
        var lDatas = [];
        if (height.toString() in processDatas) {
            lDatas = processDatas[height.toString()];
        }
        lDatas.push([datas[i][0], datas[i][1]]);
        processDatas[height.toString()] = lDatas;
    }
    var threeDNoiseData = generate3dNoiseData();
    var count = 0;
    var new_all_datas = []
    for (var key in processDatas) {
        var pDatas = processDatas[key];
        var pDatasLengh = pDatas.length / 4;
        for (var i = 0; i < pDatasLengh; i++) {
            j = i * 4;
            coords_data = [pDatas[j], pDatas[j + 1], pDatas[j + 2], pDatas[j + 3], pDatas[j]];
            var pPointDatas = getPointsFromLineByStaticDistance(coords_data);
            for (var j = 0; j < pPointDatas.length; j++) {
                new_all_datas.push([pPointDatas[j][0], pPointDatas[j][1], parseInt(key), threeDNoiseData[count]]);
                count += 1;
            }
        }
    }
    return new_all_datas;
}

//建立3D自然噪聲點數據(For demo)
function generate3dNoiseData() {
    var noise = new SimplexNoise(Math.random);
    var data = [];
    for (var i = 0; i < 100; i++) {
        for (var j = 0; j < 100; j++) {
            for (var k = 0; k < 100; k++) {
                var value = noise.noise3D(i / 20, j / 20, k / 20) * 60 + 10;
                data.push(value);
            }
        }
    }
    return data;
}

//建立自然噪聲點數據(For demo)
function createNoiseData(point_count) {
    var noise = new SimplexNoise(Math.random);
    var noise_data = [];
    var c = Math.ceil(Math.sqrt(point_count));
    for (var i = 0; i < c + 1; i++) {
        for (var j = 0; j < c + 1; j++) {
            var value = noise.noise2D(i / 20, j / 20) * 40 + 40;
            noise_data.push(value);
        }
    }
    return noise_data;
}

//建立要餵入echarts的格式
function createFlightPointsData(gpsList, height) {
    //建立自然噪聲點數據(For demo)
    let noiseData = createNoiseData(gpsList.length);
    var coord_data = [];
    for (var k = 0; k < gpsList.length; k++) {
        var gps = gpsList[k];
        coord_data.push({
            name: '',
            value: [gps[0], gps[1], height, noiseData[k]],
            itemStyle: {
                'color': 'white',
                'opacity': 0.8
            }
        });
    }
    return coord_data;
}

//建立要餵入echarts的格式
function createFlightPointsDataByHeightRange(gpsList, circle_count, min_height, max_height) {
    //計算每點上升高度
    var eachHeight = (max_height - min_height) / circle_count;
    var stepHeight = eachHeight / 360.0;
    var currentHeight = min_height;
    //建立自然噪聲點數據(For demo)
    let noiseData = createNoiseData(gpsList.length);
    var coord_data = [];
    for (var k = 0; k < gpsList.length; k++) {
        var gps = gpsList[k];
        coord_data.push({
            name: '',
            value: [gps[0], gps[1], currentHeight += stepHeight, noiseData[k]],
            itemStyle: {
                'color': 'white',
                'opacity': 0.8
            }
        });
    }
    return coord_data;
}

//形狀:正方形
function createSqureCoords(center_coord, radius) {
    var point = turf.point([center_coord[1], center_coord[0]]);
    var distance = Math.sqrt((Math.pow(radius, 2) + Math.pow(radius, 2)));
    var bearings = [45, 135, 225, 315];
    var options = { units: 'kilometers' };
    var result = [];
    for (var i = 0; i < bearings.length; i++) {
        var destination = turf.destination(point, distance, bearings[i], options);
        result.push(destination);
    }
    result.push(result[0]);  // 加入起點為最後一條線終點
    var line = [];
    for (var i = 0; i < result.length; i++) {
        line.push(result[i].geometry.coordinates);
    }

    return createFlightPointsData(getPointsFromLineByStaticDistance(line), dataHeight);
}

//形狀:米字
function createStarCoords(center_coord, radius) {
    var point = turf.point([center_coord[1], center_coord[0]]);
    var distance = Math.sqrt((Math.pow(radius, 2) + Math.pow(radius, 2)));
    var bearings = [0, 45, 90, 135, 180, 225, 270, 315];
    var options = { units: 'kilometers' };
    var result = [];
    for (var i = 0; i < bearings.length; i++) {
        var destination = turf.destination(point, distance, bearings[i], options);
        result.push(destination);
    }
    var line1 = [result[0].geometry.coordinates, result[4].geometry.coordinates];
    var line2 = [result[1].geometry.coordinates, result[5].geometry.coordinates];
    var line3 = [result[2].geometry.coordinates, result[6].geometry.coordinates];
    var line4 = [result[3].geometry.coordinates, result[7].geometry.coordinates];

    var lines = [line1, line2, line3, line4];

    var allCoords = [];
    for (var i = 0; i < lines.length; i++) {
        var pointByDistance = getPointsFromLineByStaticDistance(lines[i]);
        var flightPoints = createFlightPointsData(pointByDistance, dataHeight);
        allCoords = allCoords.concat(flightPoints);
    }
    return allCoords;
}

//形狀:漏斗
function createFunnelCoords(center_coord, radius) {
    var point = turf.point([center_coord[1], center_coord[0]]);
    var distance = Math.sqrt((Math.pow(radius, 2) + Math.pow(radius, 2)));
    var bearings = [0, 45, 90, 135, 180, 225, 270, 315];
    var options = { units: 'kilometers' };
    var result = [];
    for (var i = 0; i < bearings.length; i++) {
        var destination = turf.destination(point, distance, bearings[i], options);
        result.push(destination);
    }
    var line1 = [result[0].geometry.coordinates, result[4].geometry.coordinates];
    var line2 = [result[0].geometry.coordinates, result[2].geometry.coordinates];
    var line3 = [result[2].geometry.coordinates, result[6].geometry.coordinates];
    var line4 = [result[4].geometry.coordinates, result[6].geometry.coordinates];

    var lines = [line1, line2, line3, line4];

    var allCoords = [];
    for (var i = 0; i < lines.length; i++) {
        var pointByDistance = getPointsFromLineByStaticDistance(lines[i]);
        var flightPoints = createFlightPointsData(pointByDistance, dataHeight);
        allCoords = allCoords.concat(flightPoints);
    }
    return allCoords;
}

//形狀:圓形
function createCircleCoords(center_coord, radius) {
    points = [];
    radius = radius / 100;
    for (var i = 0; i < 360; i++) {
        x = center_coord[0] + (radius * Math.cos(degrees_to_radians(i)));
        y = center_coord[1] + (radius * Math.sin(degrees_to_radians(i)));
        points.push([y, x]);
    }
    var flightPoints = createFlightPointsData(points, dataHeight);
    return flightPoints;
}

//形狀:圓柱
function createSpringCoords(center_coord, radius, circle_count, min_height, max_height) {
    points = [];
    radius = radius / 100;
    for (var j = 0; j < circle_count; j++) {
        for (var i = 0; i < 360; i++) {
            x = center_coord[0] + (radius * Math.cos(degrees_to_radians(i)));
            y = center_coord[1] + (radius * Math.sin(degrees_to_radians(i)));
            points.push([y, x]);
        }
    }
    var flightPoints = createFlightPointsDataByHeightRange(points, circle_count, min_height, max_height);
    return flightPoints;
}

//形狀:金字塔
function createPyramidCoords(center_coord, radius, decreaseRadius, level, levelHeight, min_height) {
    var allCoords = [];
    for (var i = 0; i < level; i++) {
        var point = turf.point([center_coord[1], center_coord[0]]);
        var distance = Math.sqrt((Math.pow(radius - (i * (1 - decreaseRadius)), 2) + Math.pow(radius - (i * (1 - decreaseRadius)), 2)));
        var bearings = [45, 135, 225, 315];
        var options = { units: 'kilometers' };
        var result = [];
        for (var j = 0; j < bearings.length; j++) {
            var destination = turf.destination(point, distance, bearings[j], options);
            result.push(destination);
        }
        result.push(result[0]);  // 加入起點為最後一條線終點
        var lines = [];
        for (var j = 0; j < result.length; j++) {
            lines.push(result[j].geometry.coordinates);
        }
        var pointByDistance = getPointsFromLineByStaticDistance(lines);
        var flightPoints = createFlightPointsData(pointByDistance, min_height + (i * levelHeight));
        allCoords = allCoords.concat(flightPoints);
    }
    return allCoords;
}

//Tools
//獲得地理線段上每隔特定距離的每點座標
function getPointsFromLineByStaticDistance(line) {
    //lineString: 2個或以上的點組成的線
    var lineString = turf.lineString(line);
    //lineChunk: （lineString, 分割距離(預設單位:公里), 可選參數）
    var chunk = turf.lineChunk(lineString, 0.05, {});
    var new_data = [];
    for (var i = 0; i < chunk.features.length; i++) {
        new_data.push(chunk.features[i].geometry.coordinates[0]);
    }
    return new_data;
}

//角度轉弧度
function degrees_to_radians(degrees) {
    var pi = Math.PI;
    return degrees * (pi / 180);
}

//載入地圖
function loadMap() {
    //進行echarts設定，餵入之前定義好的常數-option
    chart.setOption(option, true);

    //從echarts取得mapbox的實體
    var map = chart.getModel().getComponent("mapbox3D")._mapbox;

    //地圖圖資載入完畢後，顯示在Mapbox上的3D建築物圖層。
    map.on('load', function () {
        var layers = map.getStyle().layers;
        var labelLayerId;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                labelLayerId = layers[i].id;
                break;
            }
        }
        map.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': '#8EAACB',
                'fill-extrusion-height': [
                    "interpolate", ["linear"],
                    ["zoom"],
                    15, 0,
                    15.05, ["get", "height"]
                ],
                'fill-extrusion-base': [
                    "interpolate", ["linear"],
                    ["zoom"],
                    15, 0,
                    15.05, ["get", "min_height"]
                ],
                'fill-extrusion-opacity': .6
            }
        }, labelLayerId);
    });
}

function createShape(file) {
    let coordinatesArray = [];
    return fetch(file)
        .then(response => response.text())
        .then(csvString => {
            coordinatesArray = parseCSV(csvString);
            return createFlightPointsData(getPointsFromLineByStaticDistance(coordinatesArray), dataHeight);
        })
        .catch(error => console.error('Error reading CSV file:', error));
}

function parseCSV(csvContent) {
    let coordinatesArray = [];
    const lines = csvContent.split('\n');

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            // const pointMatch = line.match(/POINT \(([-\d.]+) ([-\d.]+) ([-.\d]+)\)/);
            // if (pointMatch) {
            //     const longitude = parseFloat(pointMatch[1]);
            //     const latitude = parseFloat(pointMatch[2]);
            //     console.log(pointMatch[1]);
            //     console.log(pointMatch[2]);
            //     coordinatesArray.push([longitude, latitude]);
            // }

            const polygonMatch = line.match(/(POLYGON \(\([-\.\d\s,]+\)\))/);
            if (polygonMatch) {
                const polygonString = polygonMatch[1];
                const coordinateMatch = polygonString.match(/([-.\d]+) ([-.\d]+)/g);

                if (coordinateMatch) {
                    const polygonCoordinates = coordinateMatch.map(pair => {
                        const [longitude, latitude] = pair.split(' ').map(parseFloat);
                        return [longitude, latitude];
                    });
                    coordinatesArray = polygonCoordinates;
                }
            }
        }
    }

    return coordinatesArray;
}

async function run() {
    try {
        polygon1 = await createShape('test1.csv');
        polygon2 = createSpringCoords([22.328838, 120.366518], 0.1, 3, 100, 300);

        polygon3 = await createShape('test2.csv');

        loadScatterFlightPlanPath(polygon1.concat(polygon2));
    } catch (e) {
        console.log(e);
    }
}

function buttunClick(allData) {
    var switchButton = document.getElementById('switchButton');
    var allButton = document.getElementById('allButton');

    allButton.addEventListener('click', function () {
        loadScatterFlightPlanPath(polygon1.concat(polygon2, polygon3));
    });

    let route = true;
    switchButton.addEventListener('click', function () {
        if (route) {
            switchButton.innerText = '路線2';
            loadScatterFlightPlanPath(polygon3);
            setChart(allData[1]);
        }
        else {
            switchButton.innerText = '路線1';
            loadScatterFlightPlanPath(polygon1.concat(polygon2));
            setChart(allData[0]);
        }
        route = route ? false : true;
    });
}

function setChart(data) {
    var barChart = echarts.init(document.getElementById('rightTwo'));
    var lineChart = echarts.init(document.getElementById('rightThree'));
    createChart(data, "bar", barChart);
    createChart(data, "line", lineChart);
    createGaugeChart("", 0);
    createRadarChart("", []);
}

// 創建柱狀圖或折線圖
function createChart(data, type, chart) {
    var values = data["value"];
    var dateList = [];
    var tempList = [];
    var rhList = [];

    for (var i = 0; i < values.length; i++) {
        var v = values[i];
        dateList.push(v["date"]);
        tempList.push(v["temp"]);
        rhList.push(v["rh"]);
    }

    var option = {
        title: {
            text: data['station'] + " 月平均溫度",
            textStyle: {
                color: '#A41623'
            }
        },
        visualMap: {
            type: 'continuous',  //連續型
            // type: 'piecewise',   //分段型
            // splitNumber: 3,      //分段型段數
            orient: 'horizontal',
            left: 'center',
            min: 10,
            max: 36,
            text: ['Hot', 'Cold'],
            dimension: 1,
            inRange: {
                color: ['#65B581', '#FFCE34', '#FD665F']
            }
        },
        xAxis: {
            type: 'category',
            data: dateList
        },
        yAxis: {
            type: 'value',
            min: 10,
            max: 40
        },
        series: [
            {
                data: tempList,
                type: type   //"bar"
            }
        ]
    };

    chart.setOption(option);

    chart.on('click', params => {
        var date = params.name;
        for (var i = 0; i < values.length; i++) {
            var v = values[i];
            if (date == v["date"]) {
                // 驅動儀錶板圖
                createGaugeChart(date, v["rh"]);
                // 驅動雷達圖
                var radarValue = [v['temp'], v['rain'], v['rh'], v['daylight_hr']];
                createRadarChart(date, radarValue);
            }
        }
    })
}

// 創建儀錶板圖
function createGaugeChart(data, value) {
    var gaugeChart = echarts.init(document.getElementById('rightFour-left'));
    option = {
        title: {
            text: data + "平均相對濕度",
            textStyle: {
                color: '#A41623',
                fontSize: 11
            }
        },
        series: [
            {
                type: 'gauge',
                axisLine: {
                    lineStyle: {
                        width: 20,
                        color: [
                            [0.3, '#65B581'],
                            [0.7, '#FFCE34'],
                            [1, '#FD665F']
                        ]
                    }
                },
                pointer: {
                    itemStyle: {
                        color: 'auto'
                    }
                },
                axisTick: {
                    distance: -30,
                    length: 8,
                    lineStyle: {
                        color: '#fff',
                        width: 2
                    }
                },
                splitLine: {
                    distance: -30,
                    length: 30,
                    lineStyle: {
                        color: '#fff',
                        width: 4
                    }
                },
                axisLabel: {
                    color: 'inherit',
                    distance: 3,
                    fontSize: 10
                },
                detail: {
                    valueAnimation: true,
                    formatter: '{value} %',
                    fontSize: 15,
                },
                data: [
                    {
                        value: value
                    }
                ]
            }
        ]
    };
    gaugeChart.setOption(option);
}

// 創建雷達圖
function createRadarChart(data, value) {
    var radarChart = echarts.init(document.getElementById('rightFour-right'));
    option = {
        title: {
            text: data + '氣候數據\n雷達圖',
            textStyle: {
                color: '#A41623',
                fontSize: 11
            }
        },
        lineStyle: {
            color: '#8BBEB2'
        },
        radar: {
            shape: 'circle',
            indicator: [
                { name: '平均溫度', max: 50 },
                { name: '雨量', max: 500 },
                { name: '平均濕度', max: 100 },
                { name: '日照', max: 250 }
            ]
        },
        series: [
            {
                name: 'Budget vs spending',
                type: 'radar',
                data: [value],
            }
        ]
    };
    radarChart.setOption(option);
}
