<template>
    <!--<div>-->
    <!--<canvas width="600" height="576" id="RRIntervalCanvas1"></canvas>-->
    <div style="position: relative;width: 450px;height: 290px;">
        <canvas width="600" height="576" id="RRIntervalCanvas1"
                style="position: absolute;left: 0; top:0; z-index: 1;"></canvas>
        <canvas width="600" height="576" id="tempCanvas"
                style="position: absolute;top: 0;left: 0; z-index: 99"></canvas>
    </div>
</template>
<script>
    import {mapMutations, mapState} from 'vuex';
    import API from '../../api/api_ecg_view';

    export default {
        name: 'rrIntervalScatter',
        data() {
            return {
                fillColorMap: {
                    N: '#1dd307',
                    V: '#d03934',
                    S: '#414ad1'
                },
                selectArr: []
            }
        },
        computed: {
            ...mapState('ecgView', {
                fastData: state => state.ecgFastData
            })
        },
        mounted () {
            this.changeType('scatter');
            this.initCanvas();
        },
        watch: {
            fastData: function () {
                this.initCanvas();
            }
        },
        methods: {
            ...mapMutations('paperBlock', [
                'changeSelected',
                'changeType'
            ]),
            initCanvas(option = {}) {
                let c_canvas = document.getElementById('RRIntervalCanvas1');
                let tempCanvas = document.getElementById('tempCanvas');
                let options = {
                    data: this.fastData,
                    rhythms: [],
                    x_start_pos: 40,
                    x_end_pos: 560,
                    timeData: [0, 500, 1000, 1500, 2000, 2500, 3000],
                    yMax: 3000
                };
                options = Object.assign(options, option);
                let context = c_canvas.getContext("2d");
                let tempContext = tempCanvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                this.drawGrid(c_canvas, options);
                this.draw(tempCanvas, tempContext, options);
            },
            draw(canvas, ctx, options){
                let that = this;
                let {x_start_pos, x_end_pos, timeData, data, yMax, rhythms} = {...options};
                that.drawScatter(ctx, x_start_pos, x_end_pos, data, yMax, rhythms);
                canvas.onmousedown = function (ev) {
                    var ev = ev || event;
                    that.selectArr = [];
                    ctx.beginPath();
                    ctx.strokeStyle = "#000";
                    ctx.moveTo(ev.layerX, ev.layerY);

                    document.onmousemove = function (ev) {
                        var ev = ev || event;
                        ctx.lineTo(ev.layerX, ev.layerY);
                        ctx.stroke();
                    };
                    document.onmouseup = function (ev) {
                        document.onmousemove = document.onmouseup = null;
                        ctx.closePath();
                        ctx.stroke();
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        that.drawScatter(ctx, x_start_pos, x_end_pos, data, yMax, rhythms);
                    }
                }
            },
            drawGrid(c_canvas, options) {
                let {x_start_pos, x_end_pos, timeData, data, yMax, rhythms} = {...options};
                this.drawClick(c_canvas, x_start_pos, x_end_pos, timeData, yMax);
//                this.drawScatter(c_canvas, x_start_pos, x_end_pos, data, yMax, rhythms);
            },
            drawClick(c_canvas, x_start_pos, x_end_pos, timeData, yMax) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.font = "8pt Calibri";
                context.fillStyle = '#000';
                // 绘制x,y轴
                context.moveTo(x_start_pos, 566);
                context.lineTo(x_start_pos, 10);
                context.moveTo(x_start_pos, 566);
                context.lineTo(x_end_pos, 566);
                //画坐标轴的单位
                context.fillText('(ms)', 45, 20);
                context.fillText('(ms)', x_end_pos + 15, 572);
                // 绘制y轴click
                for (let y = yMax; y >= 0; y -= 500) {
                    context.moveTo(x_start_pos, 10 + (yMax - y) * (556 / yMax));
                    context.lineTo(x_start_pos - 6, 10 + (yMax - y) * (556 / yMax));
                    if (y % 1000 === 0) {
                        if (y > 0) {
                            context.fillText(y, x_start_pos - 32, 13 + (yMax - y) * (556 / yMax));
                        } else {
                            context.fillText(y, x_start_pos - 14, 13 + (yMax - y) * (556 / yMax));
                        }
                    }
                }
                //                绘制x轴click
                for (let x = 0; x < timeData.length; x++) {
                    let xPos = x_start_pos + x * (x_end_pos - x_start_pos) / 6;
                    if (x === 0) continue;
                    context.moveTo(xPos, 561);
                    context.lineTo(xPos, 566);
                    if (timeData[x] % 1000 === 0) {
                        context.fillText(timeData[x], xPos - 12, 576);
                    }
                }
                context.stroke();
                context.closePath();

            },
            drawScatter(ctx, x_start_pos, x_end_pos, data, yMax, rhythms) {
                rhythms = rhythms.filter(e => {
                    return e.type === 'NOISE'
                });
                let pre2Tag = null;
                let preTag = null;
                let currentTag = null;
                let draw_cycle = true;
                for (let i = 0; i < data.length; i++) {
                    if (data[i].t === 'Q') {
                        pre2Tag = null;
                        preTag = null;
                        continue;
                    }
                    if (pre2Tag === null) {
                        pre2Tag = data[i];
                    } else if (preTag === null) {
                        preTag = data[i];
                    } else {
                        draw_cycle = true;
                        currentTag = data[i];
                        let rri1 = (preTag.p - pre2Tag.p) / 512;
                        let rri2 = (currentTag.p - preTag.p) / 512;
                        for (let j = 0; j < rhythms.length; j++) {
                            let rhyLen = rhythms[j].end - rhythms[j].begin;
                            if (rhyLen + (currentTag.p - preTag.p) >= Math.max(currentTag.p, rhythms[j].end) - Math.min(preTag.p, rhythms[j].begin)) {
                                draw_cycle = false;
                                break;
                            }
                            if (rhyLen + (preTag.p - pre2Tag.p) >= Math.max(preTag.p, rhythms[j].end) - Math.min(pre2Tag.p, rhythms[j].begin)) {
                                draw_cycle = false;
                                break;
                            }
                        }
                        if (!draw_cycle) {
                            pre2Tag = currentTag;
                            preTag = null;
                            continue;
                        }
                        if (rri2 < 60 && rri1 < 60 && rri2 > 0 && rri1 > 0) {
                            ctx.fillStyle = this.fillColorMap[preTag.t] || '#666';
                            let y = rri2 * 1000;
                            let x = rri1 * 1000;
                            if (y > 3000) {
                                y = 3000;
                            }
                            let xPos = x_start_pos + (x_end_pos - x_start_pos) / 3000 * x;
                            let yPos = 10 + (yMax - y) * (566 / yMax);
                            if (ctx.isPointInPath(xPos, yPos)) {
                                this.selectArr.push(data[i].p);
                                ctx.fillStyle = 'red';
                            } else {
                                ctx.fillStyle = '#000';
                            }
                            ctx.fillText('·', xPos, yPos + 4);
                            ctx.stroke();
                        }
                        pre2Tag = preTag;
                        preTag = currentTag;
                    }
                }
                this.changeSelected(Array.from(this.selectArr));
            }
        }
    }
</script>
<style scoped>

</style>