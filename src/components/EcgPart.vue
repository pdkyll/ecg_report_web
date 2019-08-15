<template>
    <div  :style="{transform: `scale(${scaleNum})`}" class="singlePageTransform">
        <div class="singlePage" v-loading="loading" ref="singlePage">
            <div style="position: relative">
                <h2 class="centerWords">心电片段节选</h2>
                <div style="position: absolute; right: 2px;top: 20px;">
                    <el-select v-model="showAdd" placeholder="请选择增益" @change="changeAdd" :disabled="fromTooltip">
                        <el-option
                                v-for="addItem in adds"
                                :key="addItem.value"
                                :label="addItem.label"
                                :value="addItem.value"
                        ></el-option>
                    </el-select>
                </div>
            </div>

            <div class="flexWords">
                <div>
                    <span class="boldText">姓名</span>
                    <span class="smallText" id="name">{{patientInfo.name}}</span>
                </div>
                <div>
                    <span class="boldText">编号</span>
                    <span class="smallText" id="code">{{reportId}}</span>
                </div>
                <div>
                    <span class="boldText">记录时间</span>
                    <span class="smallText" id="time"> {{patientInfo.time}}</span>
                </div>
            </div>
            <div class="content">
                <div class="partTitle">{{titleType}}<span v-if="patientInfo.extra">：{{patientInfo.extra}}</span> <span v-if="rate && !patientInfo.extra">({{rate}}bpm)</span> <br/>
                    <span>{{partTime}}</span></div>
                <span class="averageRhythm">平均心率:{{averageRhythm}} bpm</span>
                <span class="showAdd">{{showAdd}}mm/mV 25mm/s</span>
                <div class="canvasBox">
                    <canvas width="800px" height="1258px" class="ecg"></canvas>
                </div>
            </div>
            <div class="remarks">注：Q为噪声过大心搏，V为室性心搏，S为室上性心搏</div>
        </div>
    </div>
</template>
<script>
    import {mapMutations, mapState} from 'vuex'
    import API from '../api/api_report';
    import {bus} from '../bus';

    export default {
        name: 'EcgPart',
        props: {
            fromTooltip: {
                type: Boolean,
                default: false
            },
            position: {
                type: Number,
                default: -1
            },
            type: {
                type: String,
                default: ''
            },
//            partTime: {
//                type: String,
//                default: ''
//            },
            label: {
                type: String,
                default: ''
            },
            toolTipHeight: {
                type: Number
            },
            rate: {
                type: Number,
                default: 0
            }
        },
        data() {
            return {
                partTime: '',
                data: [],
                loading: false,
                dateTime: '',
                adds: [
                    {value: '5', label: '5mm/mV'},
                    {value: '10', label: '10mm/mV'},
                    {value: '20', label: '20mm/mV'}
                ],
                sec: 0,
                tagPos: [],
                rhythm: [
//                    {begin: 3000, end: 3890},
//                    {begin: 1234, end: 2597},
//                    {begin: 8564, end: 11354}
                ],
                title: '长间歇(RR间期=1.6s)',
                averageRhythm: 62,
                showAdd: '10',
                reportId: -1,
                abnormalType: 0,
                patientInfo: {
                    name: '暂无',
                    code: '',
                    extra: '',
                    time: ''
                },
                scaleNum: 1,
                abnormalTypeMap: {
                    'V': '单个室早',
                    'ASY': '窦性停博',
                    'BRD': '窦性心动过缓',
                    'TAC': '窦性心动过速',
                    'ARR': '窦性心律不齐',
                    'MIS': '漏搏',
                    'VC': '成对室早',
                    'CV': '多发室早',
                    'BGM': '室性二联律',
                    'TGM': '室性三联律',
                    'VR': '室性节律',
                    'VF': '室颤',
                    'RONT': 'R on T',
                    'VTAC': '室性心动过速',
                    'VBRD': '室性心动过缓',
                    'S': '单个房早',
                    'SC': '成对房早',
                    'CS': '多发房早',
                    'SBGM': '房性二联律',
                    'STGM': '房性三联律',
                    'STAC': '室上性心动过速',
                    'SBRD': '室上性心动过缓',
                    'SVR': '室上性节律',
                    'AFIB': '房颤',
                    'LRR': '长RR间歇',
                    'NOISE': '噪音',
                    'SB': '节拍S',
                    'VB': '节拍V',
                    'QB': '节拍Q',
                    'MAXHR': '最快心率',
                    'MINHR': '最慢心率',
                    'NORMAL': '正常心率',
                    'AF': '房颤',
                    'AFLUT': '房扑'
                }
            }
        },
        computed: {
            titleType() {
                if (this.abnormalType === 'LRR') {
                    return '长RR间歇片段'
                } else if (this.abnormalType === 'MAXHR') {
                    return '最快心率片段'
                } else if (this.abnormalType === 'MINHR') {
                    return '最慢心率片段'
                } else {
                    return this.type
                }
            }
        },
        watch: {
            add: function () {
                this.initCanvas();
            },
            position: function () {
                this.initShowEcgPart();
            }
        },
        mounted() {
            this.initShowEcgPart();
            if (this.fromTooltip) {
                let heightPer = 860 / 0.6;
                this.scaleNum = this.toolTipHeight / heightPer;
            }

        },
        methods: {
            ...mapMutations('ecgPart', [
                'changeAddSelected'
            ]),
            changeAdd(data) {
                this.changeAddSelected(data);
                this.$emit('changeAdds', data);
                API.changeEcgAdd(this.reportId, this.position, {
                    mmPerMv: Number(this.showAdd),
                    position: this.position,
                    reportId: this.reportId,
                    type: this.label
                }).then(() => {});
                this.initCanvas();
            },
            initShowEcgPart() {
                this.reportId = localStorage.getItem('report_id');
                this.abnormalType = this.label;
                this.title = this.abnormalTypeMap[this.type];
                this.$nextTick(() => {
                    this.getAbnormalData();
                })
            },
            getAbnormalData() {
                if (this.reportId !== -1) {
                    this.rhythm = [];
                    this.tagPos = [];
                    this.loading = true;
                    API.getAbnormalData({
                        report_id: this.reportId,
                        position: this.position,
                        label: this.abnormalType
                    }).then(data => {
                        this.patientInfo.code = data.patient_id || '暂无 ';
                        this.patientInfo.name = data.name || '暂无';
                        this.patientInfo.extra = data.extra;
                        this.patientInfo.time = data.start_time + ' - ' + data.end_time;
                        if (this.label !== 'V' && this.label !== 'S') {
                            this.partTime = data.abnormal_start_time + ' - ' + data.abnormal_end_time;
                        } else {
                            this.partTime = data.abnormal_start_time
                        }
                        data.abnormal_rhythms.map(item => {
                            this.rhythm.push({
                                begin: item.position,
                                end: item.position + item.length,
                                label: item.label
                            });
                        });
                        this.showAdd = data.mm_per_mv.toString();
                        let labels = data.abnormal_beats.labels;
                        let positions = data.abnormal_beats.positions;
                        this.averageRhythm = parseInt(data.mean_heart_rate);
                        for (let i = 0; i < labels.length; i++) {
                            this.tagPos.push({
                                label: labels[i],
                                position: positions[i]
                            })
                        }
                        this.data = data.data;
                        //因为element 的 tooltip添加了open-delay 所以造成tooltip展开的时候可能会丢失dom元素
                        //但是很坑的是element没有封装监听 tooltip打开完毕的函数，所以只能僵硬的等待，设置了和element open-delay一样的时间
                        setTimeout(() => {
                            this.loading = false;
                            this.initCanvas();
                        }, 300);
                    }).catch(() => {
                        this.loading = false;
                    })
                }
            },
            initCanvas() {
                let c_canvas = $('.ecg')[0];
                let options = {
                    data: this.data,
                    frequency: 512 * 6,
                    x_start_pos: 40,
                    x_end_pos: 790,
                    y_start_pos: [40, 280, 520, 760, 1000],
                    y_height: 200,
                    add: this.showAdd,
                    tagData: this.tagPos,
                    rhythm: this.rhythm
                };
                if (c_canvas) {
                    let context = c_canvas.getContext("2d");
                    context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                    this.drawGrid(c_canvas, options);
                }
            },
            drawMediumGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#ccc";
                context.strokeWidth = 1;
                context.beginPath();
                y_start_pos.map(item => {
                    let y_end_pos = item + y_height;
                    for (let x = x_pos; x < x_end_pos; x += 25) {
                        context.moveTo(x + 0.5, item + 0.5);
                        context.lineTo(x + 0.5, y_end_pos - 0.5);
                    }
                    for (let y = item; y < y_end_pos; y += 25) {
                        context.moveTo(x_pos + 0.5, y + 0.5);
                        context.lineTo(x_end_pos, y + 0.5);
                    }
                });

                context.stroke();
                context.closePath();
                return;
            },
            drawClick(c_canvas, x_pos, x_end_pos, y_start_pos, add, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.font = "8pt Calibri";
                context.fillStyle = '#000';

                let yData = [4, 3, 2, 1, 0, -1, -2, -3, -4];
                let sec = 0;
                y_start_pos.map(item => {
                    let yEnd = item + y_height;
                    for (let x = x_pos; x <= x_end_pos; x += 25) {
                        if (x === x_pos) {
                            context.moveTo(x + 0.5, item);
                            context.lineTo(x + 0.5, item + 6);
                            context.moveTo(x + 0.5, yEnd);
                            context.lineTo(x + 0.5, yEnd - 6);
                        } else {
                            context.moveTo(x + 0.5, item);
                            context.lineTo(x + 0.5, item + 6);
                            context.moveTo(x + 0.5, yEnd);
                            context.lineTo(x + 0.5, yEnd - 6);
                        }
                        if (sec.toString().indexOf('.') !== -1) {
                            context.fillText(sec, x - 8, yEnd + 15);
                        } else {
                            context.fillText(sec, x - 3, yEnd + 15);
                        }
                        if (x === x_end_pos) continue;
                        sec = (Number(sec) + 0.2).toFixed(1);
                    }
                    for (let y = item, i = 0; y <= yEnd; y += 25, i++) {
                        if (i <= 7) {
                            context.moveTo(x_pos, y + 0.5);
                            context.lineTo(x_pos + 6, y + 0.5);
                            context.moveTo(x_end_pos - 6, y + 0.5);
                            context.lineTo(x_end_pos, y + 0.5);
                        }
                        if (yData[i].toString().indexOf('-') !== -1) {
                            context.fillText((yData[i] * 5 / add).toFixed(1), x_pos - 25, y + 5);
                        } else {
                            context.fillText((yData[i] * 5 / add).toFixed(1), x_pos - 20, y + 5);
                        }
                    }
                    context.fillText('mv', x_pos - 40, y_height / 2 + item);
                });

                context.stroke();
                context.closePath();
                return;
            },
            drawTags(c_canvas, x_pos, x_end_pos, y_start_pos, tagData, frequency) {
                let context = c_canvas.getContext("2d");
                tagData.map(item => {
                    let index = parseInt((item.position - 1) / frequency);
                    let xPosition = item.position % frequency / frequency * (x_end_pos - x_pos) + x_pos;
                    let yPosition = y_start_pos[index] + 20;
                    context.fillStyle = item.color || '#ff0132';
                    if (item.label === 'N') {
                        context.font = "24pt Calibri";
                        context.fillText('·', xPosition - 6, yPosition);
                    } else {
                        context.font = "12pt Calibri";
                        context.fillText(item.label, xPosition - 7, yPosition);
                    }
                    if (item.delete) {
                        context.beginPath();
                        context.moveTo(xPosition - 2, yPosition - 4);
                        context.lineTo(xPosition + 10, yPosition - 4);
                        context.stroke();
                        context.closePath();
                    }
                });
                return;
            },
            drawRyhthm(c_canvas, x_pos, x_end_pos, y_start_pos, rhythmData, frequency, y_height) {
                let context = c_canvas.getContext("2d");
                context.font = "10pt Calibri";
                rhythmData.map(item => {
//                    开始节律标志
                    let indexBegin = parseInt(item.begin / frequency);
                    let xPositionBegin = item.begin % frequency / frequency * (x_end_pos - x_pos) + x_pos - 3;
                    let yPositionBegin = y_start_pos[indexBegin] + y_height - 20;
                    context.fillStyle = '#000';
                    context.fillText('(' + item.label, xPositionBegin - 10, yPositionBegin - 12);
//                    结束节律标志
                    let indexEnd = parseInt((item.end - 1) / frequency);
                    let xPositionEnd = (item.end - 1) % frequency / frequency * (x_end_pos - x_pos) + x_pos - 3;
                    let yPositionEnd = y_start_pos[indexEnd] + y_height - 20;
                    context.fillStyle = '#000';
                    context.fillText(item.label + ')', xPositionEnd - 10, yPositionEnd);
                });
                return;
            },
            drawBigGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();

                y_start_pos.map(item => {
                    let y_end_pos = item + y_height;
                    context.moveTo(x_pos + 0.5, item + 0.5);
                    context.lineTo(x_end_pos, item + 0.5);

                    context.moveTo(x_pos + 0.5, item + 0.5);
                    context.lineTo(x_pos + 0.5, y_end_pos - 0.5);

                    context.moveTo(x_end_pos, item + 0.5);
                    context.lineTo(x_end_pos, y_end_pos - 0.5);

                    context.moveTo(x_pos + 0.5, y_end_pos - 0.5);
                    context.lineTo(x_end_pos, y_end_pos - 0.5);

                });
                context.stroke();
                context.closePath();
                return;
            },
            drawEcg(c_canvas, data, x_pos, x_end_pos, y_start_pos, frequency, add, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#0a1482";
                context.strokeWidth = 1;
                context.beginPath();
                let length = data.length;
                context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);
                for (let i = 0; i < length; i++) {
                    let index = parseInt(i / frequency);
                    let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                    let yPosition = y_start_pos[index] - data[i] * add * 5 + y_height / 2;
                    if (i % frequency === 0) {
                        context.moveTo(xPosition, yPosition);
                    } else {
                        context.lineTo(xPosition, yPosition);
                    }
                }
                context.stroke();
                context.closePath();
                return;
            },
            drawSmallCircle(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.fillStyle = "#ccc";
                context.strokeWidth = 1;
                context.beginPath();
                for (let index in y_start_pos) {
                    let item = y_start_pos[index];
                    let y_end_pos = item + y_height;
                    for (let x = x_pos, xIndex = 0; x < x_end_pos; x += 5, xIndex++) {
                        if (xIndex === 5) {
                            xIndex = 0;
                            continue
                        }
                        for (let y = item, yIndex = 0; y < y_end_pos; y += 5, yIndex++) {
                            if (yIndex === 5) {
                                yIndex = 0;
                                continue;
                            }
                            context.fillRect(x, y, 1, 1);
                        }
                    }

                }
                context.stroke();
                context.closePath();
                return;
            },
            drawLine(c_canvas, x_start_pos, x_end_pos, x_mouse_pos, y_mouse_pos, y_start_pos, y_height, frequency, data) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#367dc3";
                context.strokeWidth = 1;
                context.beginPath();
                let tempArr = JSON.parse(JSON.stringify(y_start_pos));

                tempArr.push(y_mouse_pos);
                let index = tempArr.sort((a, b) => a - b).indexOf(y_mouse_pos);
                let dataIndex = parseInt(frequency * (index - 1) + (x_mouse_pos - x_start_pos) / (x_end_pos - x_start_pos) * frequency);
                let fillText = data[dataIndex];
                if (index >= 0 && index <= frequency) {
                    if (fillText !== undefined) {
                        if (x_mouse_pos >= x_start_pos && x_mouse_pos <= x_end_pos) {
                            context.moveTo(x_mouse_pos, y_start_pos[index - 1] + y_height);
                            context.lineTo(x_mouse_pos, y_start_pos[index - 1]);
                            context.fillText(fillText, x_mouse_pos - 12, y_start_pos[index - 1] + 30)
                        }
                    }
                }
                context.stroke();
                context.closePath();
                return;
            },
            drawGrid(c_canvas, options) {
                let {data, x_start_pos, x_end_pos, y_start_pos, y_height, tagData, frequency, add, rhythm} = {...options};
//                绘制tag
                this.drawTags(c_canvas, x_start_pos, x_end_pos, y_start_pos, tagData, frequency);

//                绘制网格线
                this.drawMediumGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                this.drawSmallCircle(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                //                绘制边框节点
                this.drawClick(c_canvas, x_start_pos, x_end_pos, y_start_pos, add, y_height);
                this.drawBigGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
//                绘制节律标志
//                this.drawRyhthm(c_canvas, x_start_pos, x_end_pos, y_start_pos, rhythm, frequency, y_height);
                //                绘制心电信号
                this.drawEcg(c_canvas, data, x_start_pos, x_end_pos, y_start_pos, frequency, add, y_height);
            }
        }
    }
</script>
<style scoped lang="scss">
    .remarks {
        margin-top: 15px;
    }

    .singlePage {
        box-sizing: border-box;
        padding: 0 0 20px 0;
        width: 900px;
        height: 1430px;
        overflow: hidden;

        .content {
            position: relative;
            box-sizing: border-box;
            width: 100%;
            height: calc(100% - 130px);
            border: 2px solid #000;
        }

        .flexWords {
            display: flex;
            justify-content: space-around;
        }
    }

    .singlePageTransform {
        box-sizing: border-box;
        padding: 10px;
        width: 909px;
        overflow: hidden;
        transform-origin: 0 0;
    }

    h2 {
        font-weight: normal;
        height: 80px;
        line-height: 80px;
    }

    .boldText {
        font-weight: 600;
        margin-right: 20px;
    }

    .smallText {
        font-size: 14px;
    }

    .canvasBox {
        position: relative;
        width: 800px;
        margin: 0 auto;
    }

    .centerWords {
        position: relative;
        text-align: center;
    }

    .partTitle {
        position: absolute;
        top: 0;
        width: 100%;
        font-size: 14px;
        text-align: center;
    }

    .averageRhythm {
        font-size: 12px;
        position: absolute;
        top: 14px;
        left: 94px;
    }

    .showAdd {
        font-size: 12px;
        position: absolute;
        top: 14px;
        right: 69px;
    }
</style>