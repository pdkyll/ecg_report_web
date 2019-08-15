<template>
    <div class="contentBox">
        <div class="flexContent">
            <el-card class="leftCanvasBox" v-loading="loading">
                <canvas width="850px" height="800px" id="canvasBox"></canvas>
            </el-card>
            <section class="rightOperateBox">
                <el-card class="basic-info">
                    <p>病人基本信息：</p>
                    <p style="margin-top: 5px">
                        <span>性别：</span><span>{{basicInfo.genderType}}</span>
                        <span style="margin-left: 15px">年龄：</span><span>{{basicInfo.age}}</span>
                    </p>
                    <p style="margin-top: 5px">
                        <span>体重：</span><span>{{basicInfo.weight}}</span>
                        <span style="margin-left: 15px">病史：</span><span>{{basicInfo.medicalHistory}}</span>
                    </p>
                    <p class="title">
                        审核观点：
                    </p>
                    <p style="margin-top: 5px">
                        {{reviewText}}
                    </p>
                </el-card>

                <el-card class="card-margin">
                    <el-select v-model="add" placeholder="请选择增益" @change="changeAdd">
                        <el-option
                                v-for="addItem in adds"
                                :key="addItem.value"
                                :label="addItem.label"
                                :value="addItem.value"
                        ></el-option>
                    </el-select>
                </el-card>
                <el-card class="card-margin">
                    <el-button type="primary" size="small" style="width: 100%;margin-top: 5px;">
                        保存
                    </el-button>
                </el-card>

                <el-card class="card-margin">
                    <el-button type="warning" size="small" style="width: 100%;margin-top: 5px;">
                        提交
                    </el-button>
                </el-card>
            </section>
        </div>
    </div>
</template>
<script>
    import API from '../api/api_ecg_view';
    export default {
        data () {
            return {
                reviewText: '',
                basicInfo: {
                    id: "",
                    name: "未知用户",
                    genderType: "",
                    age: "",
                    weight: "",
                    medicalHistory: ""
                },
                adds: [
                    {value: '5', label: '5mm/mV'},
                    {value: '10', label: '10mm/mV'},
                    {value: '20', label: '20mm/mV'}
                ],
                add: '10',
                y_start_pos: [50, 150, 250, 350, 450, 550, 650, 750],
                data: [],
                firstLineDataIndex: 0,
                loading: false,
                scrollStartTime: 0,
                scrollEndTime: 0
            }
        },
        mounted() {
            this.getEcgData();
            this.addScrollFunc();
        },
        methods: {
            changeAdd(data){
                this.add = data;
                switch (data) {
                    case '5':
                        this.y_start_pos = [62.5, 137.5, 212.5, 287.5, 362.5, 437.5, 512.5, 587.5, 662.5, 737.5];
                        break;
                    case '10':
                        this.y_start_pos = [50, 150, 250, 350, 450, 550, 650, 750];
                        break;
                    case '20':
                        this.y_start_pos = [105, 255, 405, 555, 705];
                        break;
                    default:
                        break;
                }
                this.initCanvas();
            },
            addScrollFunc() {
                document.getElementById('canvasBox').addEventListener('mousewheel', this.onMouseWheel);
                document.getElementById('canvasBox').addEventListener('DOMMouseScroll', this.onMouseWheel);
            },
            onMouseWheel(event) {
                event.preventDefault();
                let down = true; // 定义一个标志，当滚轮向下滚时，执行一些操作
                down = event.wheelDelta ? event.wheelDelta < 0 : event.detail > 0;
                this.scrollStartTime = new Date().getTime();
                let changeIndex = 0;
                switch (this.add) {
                    case '5':
                        changeIndex = 10;
                        break;
                    case '10':
                        changeIndex = 8;
                        break;
                    case '20':
                        changeIndex = 5;
                        break;
                    default:
                        break;
                }
                if (this.scrollEndTime - this.scrollStartTime < -10) {
                    if (down) {
                        this.firstLineDataIndex += changeIndex;
                    } else {
                        this.firstLineDataIndex -= changeIndex;
                        if (this.firstLineDataIndex < 0) this.firstLineDataIndex = 0;
                    }
                    this.initCanvas();
                }
                this.scrollEndTime = new Date().getTime();
            },
            getEcgData() {
                this.loading = true;
                API.getEcgData({
                    report_id: 1,
                    block_index: 29,
                    limit: 30
                }).then(data => {
                    let temp = [];
                    for (let i = 0, len = data.length; i < len; i++) {
                        temp = temp.concat(data[i].data);
                    }
                    this.data = temp;
                    this.loading = false;
                    this.initCanvas();
                }).catch(err => {
                    this.loading = false;
                })
            },
            initCanvas() {
                let c_canvas = document.getElementById('canvasBox');
                let options = {
                    data: this.data,
                    frequency: 512 * 6,
                    add: this.add,
                    firstLineDataIndex: this.firstLineDataIndex,
                    y_start_pos: this.y_start_pos
                };
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                this.drawGrid(c_canvas);
                this.drawEcgData(c_canvas, options);
            },
            drawSmallGrid(c_canvas, x_pos = 0, x_end_pos = 850, y_start_pos = 0, y_end_pos = 800) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#edfff4";
                context.strokeWidth = 0.5;
                context.beginPath();

                for (let x = x_pos; x < x_end_pos; x += 5) {
                    context.moveTo(x + 0.5, y_start_pos + 0.5);
                    context.lineTo(x + 0.5, y_end_pos - 0.5);
                }
                for (let y = y_start_pos; y < y_end_pos; y += 5) {
                    context.moveTo(x_pos + 0.5, y + 0.5);
                    context.lineTo(x_end_pos, y + 0.5);
                }

                context.stroke();
                context.closePath();
                return;
            },
            drawMediumGrid(c_canvas, x_pos = 0, x_end_pos = 850, y_start_pos = 0, y_end_pos = 800) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#c9f5c9";
                context.strokeWidth = 1;
                context.beginPath();

                for (let x = x_pos; x < x_end_pos; x += 25) {
                    context.moveTo(x + 0.5, y_start_pos + 0.5);
                    context.lineTo(x + 0.5, y_end_pos - 0.5);
                }
                for (let y = y_start_pos; y < y_end_pos; y += 25) {
                    context.moveTo(x_pos + 0.5, y + 0.5);
                    context.lineTo(x_end_pos, y + 0.5);
                }

                context.stroke();
                context.closePath();
                return;
            },
            drawBigGrid(c_canvas, x_pos = 0, x_end_pos = 850, y_start_pos = 0, y_end_pos = 800) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#c9f5c9";
                context.strokeWidth = 1;
                context.beginPath();

                context.moveTo(x_pos + 0.5, y_start_pos + 0.5);
                context.lineTo(x_end_pos, y_start_pos + 0.5);
                context.moveTo(x_pos + 0.5, y_start_pos + 0.5);
                context.lineTo(x_pos + 0.5, y_end_pos - 0.5);
                context.moveTo(x_end_pos, y_start_pos + 0.5);
                context.lineTo(x_end_pos, y_end_pos - 0.5);
                context.moveTo(x_pos + 0.5, y_end_pos - 0.5);
                context.lineTo(x_end_pos, y_end_pos - 0.5);

                context.stroke();
                context.closePath();
                return;
            },
            drawEcg(c_canvas, data, y_start_pos, firstLineDataIndex, frequency, add, x_pos = 100, x_end_pos = 850,){
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#0a1482";
                context.strokeWidth = 1;
                context.beginPath();
                let length = 0;
                let dataIndex = frequency * 6 * firstLineDataIndex;
                switch (add) {
                    case '5':
                        length = 10 * frequency * 6;
                        break;
                    case '10':
                        length = 8 * frequency * 6;
                        break;
                    case '20':
                        length = 5 * frequency * 6;
                        break;
                    default:
                        break;
                }
                let hour = 0,
                    min = 0,
                    sec = 0;
                let time = '';
                for (let i = dataIndex; i < dataIndex + length; i++) {
                    if (data[i] !== undefined) {
                        let index = parseInt((i - dataIndex) / frequency);
                        let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                        let yPosition = y_start_pos[index] - data[i] * add * 5;

                        hour = parseInt((firstLineDataIndex + index) * 6 / 3600);
                        min = parseInt((firstLineDataIndex + index) * 6 % 3600 / 60);
                        sec = (firstLineDataIndex + index) * 6 % 3600 % 60;

                        if (i % frequency === 0) {
                            context.moveTo(xPosition, yPosition);
                        } else {
                            context.lineTo(xPosition, yPosition);
                        }
                        if (xPosition === 100) {
                            time = ('0' + hour).slice(-2) + ':' + ('0' + min).slice(-2) + ':' + ('0' + sec).slice(-2);
                            context.fillText(time, 40, y_start_pos[index] + 3);
                        }
                    }
                }
                context.stroke();
                context.closePath();
                return;
            },
            drawGrid(c_canvas) {
                this.drawSmallGrid(c_canvas);
                this.drawMediumGrid(c_canvas);
                this.drawBigGrid(c_canvas);

            },
            drawEcgData(c_canvas, options) {
                let {data, frequency, add, y_start_pos, firstLineDataIndex} = {...options};
                this.drawEcg(c_canvas, data, y_start_pos, firstLineDataIndex, frequency, add);
            }
        }
    }
</script>
<style scoped>
    .contentBox {
        position: relative;
        width: 100%;
        display: flex;
        justify-content: space-around;
    }

    .flexContent {
        box-sizing: border-box;
        width: 1140px;
        display: flex;
        justify-content: space-between;
    }

    .leftCanvasBox {
        box-sizing: border-box;
        width: 890px;
        height: 840px;
    }

    .rightOperateBox {
        width: 220px;
    }

    .card-margin {
        margin-top: 5px;
    }

    .basic-info {
        font-size: 14px;
    }

    .basic-info .title {
        margin-top: 20px;
    }
</style>