<template>
    <div style="position:relative;width: 100%" id="selfCanvasWidth" v-loading="ecgLoading"  @click="jumpToEcgPos">
        <div style="position: absolute;bottom: 20px; left: 0;width: 100%;text-align: center">{{showTime}}</div>
        <canvas id="selfScatterCanvas" :width="canvasWidth" height="230px"></canvas>
    </div>
</template>
<script>
    import {EcgViewer} from '../../common/ecg_viewer';
    import {mapState, mapMutations} from 'vuex';
    import axios from 'axios'
    import {bus} from '../../bus';

    export default {
        name: 'scatterBlock',
        data() {
            return {
                report_id: 0,
                ecgViewer: null,
                ecgData: [],
                tagData: [],
                canvasWidth: '',
                highLightBlock: {
                    start: 616,
                    end: 648
                },
                showTime: '',
                ecgLoading: false
            }
        },
        computed: {
            ...mapState('afView', {
                showPosition: state => parseInt(state.selectedPosition)
            }),
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                lastBlockIndex: state => state.lastBlockIndex
            })
        },
        watch: {
            showPosition: function () {
                this.ecgLoading = true;
                let moveToPosition = this.showPosition;
                if (moveToPosition > 2560) moveToPosition = moveToPosition - 2560;
                if (moveToPosition === -5120) {
                    this.showTime = '';
                } else {
                    this.showTime = this.calcEcgTime(this.showPosition);
                }
                this.ecgViewer.moveTo(moveToPosition);
            },
        },
        beforeDestroy() {
          this.ecgViewer = null
        },
        deactivated() {
            this.ecgViewer = null
        },
        activated() {
            this.initEcgViewer();
            this.ecgViewer.moveTo(this.showPosition - 2560);
        },
        mounted() {
            this.report_id = localStorage.getItem('report_id');
            this.canvasWidth = $('#selfCanvasWidth').width();
            this.initEcgViewer();
            this.ecgViewer.moveTo(this.showPosition - 2560);
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeSelectComponent'
            ]),
            flatArray(arr) {
                return arr.reduce((pre, cur) => {
                    return pre.concat(cur);
                }, []);
            },
            initEcgViewer() {
                if (this.ecgViewer === null) {
                    this.ecgViewer = new EcgViewer(
                        this.report_id, // reportId
                        512 * 60, // 块大小
                        this.lastBlockIndex + 1, // 块数量
                        512 * 10, // 显示数据量
                        0, // 向前预加载显示数据的2倍
                        0, // 向后预加载显示数据的2倍,
                        () => {
                            this.ecgData = this.ecgViewer.getVisibleData();
                            if (this.ecgData) {
                                let requestId = this.ecgViewer.getRequestId();
                                axios.get('/ecg/abnormal_list', {
                                    headers: {
                                        'id': requestId
                                    },
                                    params: {
                                        report_id: this.report_id,
                                        start: this.showPosition - 2560,
                                        end: this.showPosition + 2560
                                    }
                                }).then(data => {
                                    this.ecgLoading = false;
                                    this.tagData = data.data.tagPos;
                                    this.initCanvas();
                                }).catch(err => {
                                    this.ecgLoading = false;
                                });
                            }
                        }
                    );
                }
            },
            jumpToEcgPos() {
                if (this.showPosition !== -5120) {
                    this.changeSelectComponent('main');
                    bus.$emit('getPosEcg', this.showPosition, false);
                }
            },
            //计算每行心电起始时间
            calcEcgTime(index) {
                let startDate = new Date(this.ecgStartTime);
                startDate.setSeconds(startDate.getSeconds() + Math.floor(index / 512));
                let hour = startDate.getHours() < 10 ? '0' + startDate.getHours() : startDate.getHours();
                let minute = startDate.getMinutes() < 10 ? '0' + startDate.getMinutes() : startDate.getMinutes();
                let second = startDate.getSeconds() < 10 ? '0' + startDate.getSeconds() : startDate.getSeconds();
                return hour + ':' + minute + ':' + second;
            },
            initCanvas() {
                let c_canvas = $('#selfScatterCanvas')[0];
                let options = {
                    data: this.ecgData,
                    frequency: 512 * 10,
                    x_start_pos: 0,
                    x_end_pos: this.canvasWidth,
                    y_start_pos: [30],
                    y_height: 200,
                    add: 10,
                    tagData: this.tagData,
                    rhythm: []
                };
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                this.drawGrid(c_canvas, options);
            },
            drawBigGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.strokeRect(0, 0, x_end_pos, y_height + 30);
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
                return;
            },
            drawMediumGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#c3c3dc";
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
                return;
            },
            drawSmallGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_end_pos) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#d7e7ed";
                context.beginPath();
                for (let x = x_pos; x <= x_end_pos; x += 5) {
                    context.moveTo(x + 0.5, 30 + 0.5);
                    context.lineTo(x + 0.5, y_end_pos + 30 - 0.5);
                }
                for (let y = 30; y <= y_end_pos + 30; y += 5) {
                    context.moveTo(x_pos + 0.5, y + 0.5);
                    context.lineTo(x_end_pos, y + 0.5);
                }
                context.stroke();
            },
            drawEcg(c_canvas, data, x_pos, x_end_pos, y_start_pos, frequency, add, y_height) {
                let context = c_canvas.getContext("2d");
                context.lineWidth = 1;
                context.beginPath();
                let length = data.length;
                context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);
                for (let i = 0; i < length; i++) {
                    let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                    let yPosition = 20 - data[i] * add * 5 + y_height / 2;
                    context.strokeStyle = '#030304';
                    context.lineTo(xPosition, yPosition);
                }
                context.stroke();
                return;
            },
            drawTags(c_canvas, x_pos, x_end_pos, y_start_pos, tagData, frequency) {
                let context = c_canvas.getContext("2d");
                context.beginPath();

                tagData.map((item, index) => {
                    let xPosition = (item.p - this.showPosition + 2560) % frequency / frequency * (x_end_pos - x_pos) + x_pos;
                    context.font = "12pt Calibri";
                    context.fillStyle = "#000";
                    context.fillText(item.t, xPosition - 10, 20);
                    context.lineWidth = 2;
                    if (tagData[index + 1]) {
                        context.fillStyle = "#000";
                        let fillText = parseInt((tagData[index + 1].p - tagData[index].p) / 512 * 1000);
                        let nextXPosition = (tagData[index + 1].p - this.showPosition + 2560) % frequency / frequency * (x_end_pos - x_pos) + x_pos;
                        context.font = "10pt Calibri";
                        context.fillText(fillText, xPosition + (nextXPosition - xPosition) / 2 - 10, 20);
                    }
                    context.moveTo(xPosition - 4, 30);
                    context.lineTo(xPosition - 4, 26);
                });
                context.stroke();
                return;
            },
            drawGrid(c_canvas, options) {
                let {data, x_start_pos, x_end_pos, y_start_pos, y_height, tagData, frequency, add, rhythm} = {...options};
//                绘制网格线
                this.drawSmallGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                this.drawMediumGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                this.drawBigGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                this.drawTags(c_canvas, x_start_pos, x_end_pos, y_start_pos, tagData, frequency);
                this.drawEcg(c_canvas, data, x_start_pos, x_end_pos, y_start_pos, frequency, add, y_height);
            }
        }
    }
</script>
<style scoped>

</style>