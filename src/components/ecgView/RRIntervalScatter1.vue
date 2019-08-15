<template>
    <div>
        <canvas width="450" height="250" id="RRIntervalCanvas1"></canvas>
        <div class="explain">
            <p>图中点的颜色代表相邻RR间期中间心拍的类型，对应关系如下：</p>
            <p>
                <span :style="{color:fillColorMap.N}">窦性:N</span>,&nbsp;&nbsp;
                <span :style="{color:fillColorMap.V}">室早:V</span>,&nbsp;&nbsp;
                <span :style="{color:fillColorMap.S}">房早:S</span>
            </p>
        </div>
    </div>
</template>
<script>
    import {mapMutations, mapState} from 'vuex';
    import API from '../../api/api_ecg_view';

    export default {
        name: 'RRIntervalScatter1',
        data() {
            return {
                fillColorMap:{
                    N: '#1dd307',
                    V: '#d03934',
                    S: '#414ad1'
                }
            }
        },
        mounted() {
        },
        computed: {
            ...mapState('ecgView', {
                tagPos: state => state.tagPos,
                currentDateHour: state => state.currentDateHour,
                ecgStartTime: state => state.ecgStartTime,
                deleteTagState: state => state.deleteTagState,
                rhythm: state => state.rhythm,
                updateTagQState: state => state.updateTagQState,
                getTagRhythmLoading: state => state.getTagRhythmLoading,
            })
        },
        watch: {
            deleteTagState: function (deleteTagState) {
                if (deleteTagState) {
                    this.initCanvas({
                        data: this.currentHourTagsRhys(true, this.currentDateHour),
                        rhythms: this.currentHourTagsRhys(false, this.currentDateHour)
                    });
                    this.changeDeleteTagState(false);
                }
            },
            updateTagQState: function (updateTagQState) {
                if (updateTagQState) {
                    this.initCanvas({
                        data: this.currentHourTagsRhys(true, this.currentDateHour),
                        rhythms: this.currentHourTagsRhys(false, this.currentDateHour)
                    });
                    this.changeUpdateTagQState(false);
                }
            },
            getTagRhythmLoading: function (getTagRhythmLoading) {
                if (!getTagRhythmLoading) {
                    this.initCanvas({
                        data: this.currentHourTagsRhys(true, this.currentDateHour),
                        rhythms: this.currentHourTagsRhys(false, this.currentDateHour)
                    });
                }
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeDeleteTagState',
                'changeUpdateTagQState'
            ]),
            initCanvas(option = {}) {
                let c_canvas = document.getElementById('RRIntervalCanvas1');
                let options = {
                    data: [],
                    rhythms: [],
                    x_start_pos: 40,
                    x_end_pos: 410,
                    timeData: [0, 500, 1000, 1500, 2000, 2500, 3000],
                    yMax: 3000
                };
                options = Object.assign(options, option);
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                this.drawGrid(c_canvas, options);
            },
            drawGrid(c_canvas, options) {
                let {x_start_pos, x_end_pos, timeData, data, yMax, rhythms} = {...options};
                this.drawClick(c_canvas, x_start_pos, x_end_pos, timeData, yMax);
                this.drawScatter(c_canvas, x_start_pos, x_end_pos, data, yMax, rhythms);
            },
            drawClick(c_canvas, x_start_pos, x_end_pos, timeData, yMax) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.font = "8pt Calibri";
                context.fillStyle = '#000';
                // 绘制x,y轴
                context.moveTo(x_start_pos, 230);
                context.lineTo(x_start_pos, 10);
                context.moveTo(x_start_pos, 230);
                context.lineTo(x_end_pos, 230);
                //画坐标轴的单位
                context.fillText('(ms)', 45, 20);
                context.fillText('(ms)', x_end_pos + 15, 245);
                // 绘制y轴click
                for (let y = yMax; y >= 0; y -= 500) {
                    context.moveTo(x_start_pos, 10 + (yMax - y) * (220 / yMax));
                    context.lineTo(x_start_pos - 6, 10 + (yMax - y) * (220 / yMax));
                    if (y % 1000 === 0) {
                        if (y > 0) {
                            context.fillText(y, x_start_pos - 32, 13 + (yMax - y) * (220 / yMax));
                        } else {
                            context.fillText(y, x_start_pos - 14, 13 + (yMax - y) * (220 / yMax));
                        }
                    }
                }
                //                绘制x轴click
                for (let x = 0; x < timeData.length; x++) {
                    let xPos = x_start_pos + x * (x_end_pos - x_start_pos) / 6;
                    if (x === 0) continue;
                    context.moveTo(xPos, 230);
                    context.lineTo(xPos, 236);
                    if (timeData[x] % 1000 === 0) {
                        context.fillText(timeData[x], xPos - 12, 245);
                    }
                }
                context.stroke();
                context.closePath();

            },
            drawScatter(c_canvas, x_start_pos, x_end_pos, data, yMax, rhythms) {
                rhythms = rhythms.filter(e => {
                    return e.type === 'NOISE'
                });
                let context = c_canvas.getContext("2d");
                let pre2Tag = null;
                let preTag = null;
                let currentTag = null;
                let draw_cycle = true;
                for (let i = 0; i < data.length; i++) {
                    if (data[i].state !== 0 && data[i].t === 'Q') {
                        pre2Tag = null;
                        preTag = null;
                        continue;
                    }
                    if (pre2Tag === null) {
                        if (data[i].state !== 0) {
                            pre2Tag = data[i];
                        }
                    } else if (preTag === null) {
                        if (data[i].state !== 0) {
                            preTag = data[i];
                        }
                    } else if (data[i].state !== 0) {
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
                            context.fillStyle = this.fillColorMap[preTag.t] || '#666';
                            let y = rri2 * 1000;
                            let x = rri1 * 1000;
                            if (y > 3000) {
                                y = 3000;
                            }
                            let xPos = x_start_pos + (x_end_pos - x_start_pos) / 3000 * x;
                            let yPos = 10 + (yMax - y) * (220 / yMax);
                            context.beginPath();
                            context.arc(xPos, yPos, 2, 0, 360, false);
                            context.fill();//画实心圆
                            context.closePath();
                        }
                        pre2Tag = preTag;
                        preTag = currentTag;
                    }
                }
            },
            currentHourTagsRhys(isTag, currentDateHour) {
                let endTime = new Date(currentDateHour).setHours(new Date(currentDateHour).getHours() + 1);
                let startP, endP;
                if (new Date(currentDateHour).getTime() < new Date(this.ecgStartTime).getTime()) {
                    startP = 0;
                } else {
                    startP = (new Date(currentDateHour).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                }
                endP = (endTime - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                let startIndex = isTag ? this.binarySearch(startP, this.tagPos, 'p') : this.binarySearch(startP, this.rhythm, 'begin');
                let endIndex = isTag ? this.binarySearch(endP, this.tagPos, 'p') : this.binarySearch(endP, this.rhythm, 'begin');
                return isTag ? this.tagPos.slice(startIndex, endIndex) : this.rhythm.slice(startIndex, endIndex);
            },
            binarySearch(index, data, pos) {
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = parseInt((l + r) / 2);
                    let currentP = data[mid][pos];
                    if (currentP < index) {
                        l = mid + 1;
                    } else if (currentP > index) {
                        r = mid - 1;
                    } else {
                        return mid;
                    }
                }
                return l;
            },
        },
        destroyed() {

        }
    }
</script>
<style scoped lang="scss">
    #RRIntervalCanvas1 {

    }
    .explain{
        margin-left: 40px;
        font-size: 14px;
    }
</style>