<template>
    <div :style="{position: 'relative',width: canvasWidth + 'px',height: (canvasWidth - 12) + 'px',backgroundColor: '#e1e2e2',borderRadius: '4px'}"
         id="showCnavasBox">
        <canvas :width="canvasWidth" :height="canvasWidth - 24" id="RRIntervalCanvas1"
                ref="RRIntervalCanvas1"
                style="position: absolute;left: 0; top:0; z-index: 1;"></canvas>
        <canvas :width="canvasWidth" :height="canvasWidth - 24" id="tempCanvas"
                ref="tempCanvas"
                style="position: absolute;top: 0;left: 0; z-index: 99"></canvas>
        <canvas :width="canvasWidth" :height="canvasWidth - 24" id="lienCanvas"
                ref="lienCanvas"
                style="position: absolute;top: 0;left: 0; z-index: 100"></canvas>
    </div>
</template>
<script>
    import Util from '../../common/util';

    /**
     * 用于散点图的绘制，公共组件
     */
    export default {
        name: 'ScatterBlock',
        props: {
            showData: {
                type: Array,
                default: [],
            },
            canvasWidth: {
                type: Number,
                default: 0
            },
            defaultWidth: {
                type: Number,
                default: 0
            },
            isPathEmptyReturnAll: {
                type: Boolean,
                default: true
            }
        },
        data() {
            return {
                fillColorMap: {
                    N: Util.nTag, //#1dd307
                    V: Util.vTag,
                    S: Util.sTag,
                    Q: Util.qTag
                },
                circleLineArray: [],
                options: {
                    data: [],
                    rhythms: [],
                    x_start_pos: 40,
                    x_end_pos: this.canvasWidth - 40,
                    timeData: [0, 500, 1000, 1500, 2000, 2500, 3000],
                    yMax: 3000,
                },
                fontSize: 11,
                lineWidth: 1,
                scaleX: 1,
                scaleY: 1
            }
        },
        mounted() {
            this.initCanvasLineLayer();
//            this.initCanvasScatterLayer();
        },
        watch: {
            showData() {
                this.options = {
                    ...this.options,
                    data: this.showData
                };
                this.initCanvasScatterLayer(true);
            },
            canvasWidth(newValue) {
                let originWidth = this.defaultWidth;
                let originHeight = this.defaultWidth - 12;
                let XRate = (newValue - 80) / (originWidth - 80);
                let YRate = (newValue - 12 - 32) / (originHeight - 32);
                this.fontSize = this.fontSize * XRate + 2;
                this.lineWidth = this.lineWidth / 2;
                if (newValue === originWidth) {
                    XRate = 1;
                    YRate = 1;
                    this.fontSize = 12;
                    this.lineWidth = 1;
                }
                this.scaleX = XRate;
                this.scaleY = YRate;
                this.options =  {
                    ...this.options,
                    x_end_pos: newValue - 40
                };
                this.$nextTick(() => {
                    this.initCanvasLineLayer();
                    setTimeout(() => {
                        this.initCanvasScatterLayer(true);
                        if (this.circleLineArray.length) {
                            this.drawCircle(XRate, YRate);
                        }
                    }, 0);
                });
            }
        },
        methods: {
            /**
             * 初始化散点图图层，图层位于绘制划线层下层
             * @param option
             */
            initCanvasScatterLayer(redraw = false, option = {}) {
                let c_canvas = this.$refs.tempCanvas;
                this.options = Object.assign(this.options, option);
                if (c_canvas) {
                    let context = c_canvas.getContext("2d");
                    // context.beginPath();
                    this.clearCanvasLayer(c_canvas, context);
                    this.drawScactterLayer(context, this.options, redraw);
                    this.bindScatterLayerEvents(c_canvas, context, this.options)
                }
            },
            /**
             * 初始化绘制底部边框图层，图层位于底层，不会随wathc所获得的数据重绘
             * @param option
             */
            initCanvasLineLayer(option = {}) {
                let tempCanvas = this.$refs.RRIntervalCanvas1;
                this.options = Object.assign(this.options, option);
                if (tempCanvas) {
                    let context = tempCanvas.getContext('2d');
                    this.clearCanvasLayer(tempCanvas, context);
                    this.drawGridEcg(tempCanvas, this.options);
                }
            },
            /**
             * 清除图层
             */
            clearCanvasLayer(canvas, ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
            },
            /**
             * 清除画线层图层，暴露给外部
             */
            clearCanvasDrawLineLayer() {
                let lineCanvas = this.$refs.lienCanvas;
                let lineCanvasContext = lineCanvas.getContext("2d");
                lineCanvasContext.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
            },
            /**
             * 清除散点层图层，暴露给外部
             */
            clearCanvasScatterLayer() {
                let c_canvas = this.$refs.tempCanvas;
                let context = c_canvas.getContext("2d");
                context.beginPath();
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
            },
            /**
             * 清除所有图层
             */
            clearAllLayer() {
                this.clearCanvasDrawLineLayer();
                this.clearCanvasScatterLayer();
            },
            /**
             * 绘制散点图图层
             */
            drawScactterLayer(ctx, options, redraw) {
                let {x_start_pos, x_end_pos, data, yMax, rhythms} = {...options};
                this.drawScatter(ctx, x_start_pos, x_end_pos, data, yMax, rhythms, redraw);
            },
            /**
             * 绘制散点图
             * @param ctx
             * @param x_start_pos
             * @param x_end_pos
             * @param data
             * @param yMax
             * @param rhythms
             */
            drawScatter(ctx, x_start_pos, x_end_pos, data, yMax, rhythms, redraw) {
                let tempSelectArr = new Set();
                for (let i = 0; i < data.length; i++) {
                    /**
                     * 当传入数据类型部位‘O’，既噪音时才能绘制
                     */
                    if (data[i].t !== 'O') {
                        let x = data[i].x;
                        let y = data[i].y;
                        /**
                         * 这里对X，Y坐标做了限制，和产品沟通过
                         */
                        x <= 0 ? x = 100 : x >= 3000 ? x = 2900 : null;
                        y <= 0 ? y = 100 : y >= 3000 ? y = 2900 : y = y + 60;
                        let xPos = x_start_pos + (x_end_pos - x_start_pos) / 3000 * x;
                        let yPos = (yMax - y - 10) * ((this.canvasWidth - 34) / yMax);
                        if (ctx.isPointInPath(xPos + 4, yPos)) {
                            tempSelectArr.add(data[i]);
                        }
                        ctx.fillStyle = this.fillColorMap[data[i].t];
                        /**
                         * 这里采用中文字符 '●'而不是canvas的 drawCircle是因为有变换圆点颜色的需求，而drawCircle的fillColor会和其他功能有影响，而且性能也没有直接fillText高
                         */
                        ctx.font = `12px Georgia`;
                        ctx.fillText('●', xPos, yPos + 4);
                        ctx.stroke();
                    }
                }
                // 返回排序后的selectArr
                if (tempSelectArr.size === 0 && !redraw) {
                    this.$emit('changeSelectArray', data)
                }
            },
            getSelectData(position) {
                this.options = {
                    ...this.options,
                    data: position
                };
                let ctx = this.$refs.tempCanvas.getContext('2d');
                let {x_start_pos, x_end_pos, data, yMax, rhythms} = {...this.options};
                return this.caclInpath(ctx, x_start_pos, x_end_pos, data, yMax, false);
            },
            caclInpath(ctx, x_start_pos, x_end_pos, data, yMax, isEmit=true) {
                let tempSelectArr = new Set();
                for (let i = 0; i < data.length; i++) {
                    if (data[i].t !== 'O') {
                        let x = data[i].x;
                        let y = data[i].y;
                        x <= 0 ? x = 100 : x >= 3000 ? x = 2900 : null;
                        y <= 0 ? y = 100 : y >= 3000 ? y = 2900 : y = y + 60;
                        let xPos = x_start_pos + (x_end_pos - x_start_pos) / 3000 * x;
                        let yPos = (yMax - y - 10) * ((this.canvasWidth - 34) / yMax);
                        if (ctx.isPointInPath(xPos + 4 * this.scaleX, yPos)) {
                            tempSelectArr.add(data[i]);
                        }
                    }
                }
                if (isEmit) {
                    // 返回排序后的selectArr
                    if (this.circleLineArray.length === 1) {
                        this.$emit('changeSelectArray', data, false);
                        return;
                    } else {
                        if (tempSelectArr.size === 0) {
                            this.$emit('changeSelectArray', [])
                        } else {
                            this.$emit('changeSelectArray', Array.from(tempSelectArr))
                        }
                    }
                } else {
                    if (tempSelectArr.size === 0) {
                        return this.isPathEmptyReturnAll?data:[];
                    } else {
                        return Array.from(tempSelectArr)
                    }
                }
            },
            /**
             * 绘制划线层以及绑定划线层的mousemove等事件
             * @param canvas
             * @param ctx
             * @param options
             */
            bindScatterLayerEvents(canvas, ctx, options) {
                //clearCanvasEvents
                canvas.onmousedown = null;
                canvas.onmouseleave = null;
                canvas.onmouseup = null;
                this.bindCanvasEvents(canvas, ctx, options);
            },
            drawCircle(XRate, YRate) {
                let c_canvas = this.$refs.lienCanvas;
                let ctx = c_canvas.getContext("2d");
                ctx.beginPath();
                ctx.lineWidth = this.lineWidth;
                let startX = (this.circleLineArray[0].x * XRate) + 40;
                let startY = (this.circleLineArray[0].y * YRate) + 10;
                ctx.moveTo(startX, startY);
                for (let i = 1; i< this.circleLineArray.length; i++) {
                    let item = this.circleLineArray[i];
                    let x = (item.x * XRate) + 40;
                    let y = (item.y * YRate) + 10;
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                ctx.closePath();
                ctx.stroke();
            },
            bindCanvasEvents(canvas, ctx, options) {
                let that = this;
                let {x_start_pos, x_end_pos, data, yMax, rhythms} = {...options};
                /**
                 * 初始化lineCanvas，用于绘制最顶层的划线
                 * @type {HTMLElement}
                 */
                let lineCanvas = this.$refs.lienCanvas
                let lineCanvasContext = lineCanvas.getContext("2d");

                lineCanvas.onmousedown = function (ev) {
                    that.clearCanvasDrawLineLayer();
                    that.$emit('initStatus');
                    that.circleLineArray = [];
                    /**
                     * 这里为了极致性能优化，不每次去重绘有复杂逻辑判断的散点图层，而去重绘划线层，
                     * 每次当散点图框选的时候同步的绘制一根透明的 一根实心的线
                     */
                    ctx.beginPath();
                    ctx.strokeStyle = "transparent";
                    ctx.moveTo(ev.layerX, ev.layerY);
                    if (that.scaleX === 1) {
                        that.circleLineArray.push({
                            x: ev.layerX - 40,
                            y: ev.layerY - 10
                        });
                    } else {
                        that.circleLineArray.push({
                            x: (ev.layerX - 40) / that.scaleX,
                            y: (ev.layerY - 10) / that.scaleY
                        });
                    }
                    lineCanvasContext.beginPath();
                    lineCanvasContext.strokeStyle = "#000";
                    lineCanvasContext.moveTo(ev.layerX, ev.layerY);
                    let lastPos = {
                        x: 0,
                        y: 0
                    };
                    /**
                     * 绘制结束函数
                     */
                    let endDrawLine = function () {
                        lineCanvas.onmousemove = lineCanvas.onmouseup = lineCanvas.onmouseleave = null;
                        ctx.closePath();
                        ctx.stroke();
                        lineCanvasContext.closePath();
                        lineCanvasContext.stroke();
                        that.$emit('resetChangeFlag');
                        that.caclInpath(ctx, x_start_pos, x_end_pos, data, yMax);
                    };
                    lineCanvas.onmousemove = function (ev) {
                        let distanse = Math.pow(ev.layerX - lastPos.x, 2) + Math.pow(ev.layerY - lastPos.y, 2);
                        if (distanse >= 400) {
                            lastPos = {
                                ...lastPos,
                                x: ev.layerX,
                                y: ev.layerY
                            };
                            if (that.scaleX === 1) {
                                that.circleLineArray.push({
                                    x: ev.layerX - 40,
                                    y: ev.layerY - 10
                                });
                            } else {
                                that.circleLineArray.push({
                                    x: (ev.layerX - 40) / that.scaleX,
                                    y: (ev.layerY - 10) / that.scaleY
                                });
                            }
                            ctx.lineTo(ev.layerX, ev.layerY);
                            ctx.stroke();
                            lineCanvasContext.lineTo(ev.layerX, ev.layerY);
                            lineCanvasContext.stroke();
                        }
                    };
                    lineCanvas.onmouseup = function () {
                        endDrawLine();
                    };
                    lineCanvas.onmouseleave = function () {
                        endDrawLine();
                    }
                };
            },
            /**
             * 绘制地步的click Canvas
             * @param c_canvas
             * @param options
             */
            drawGridEcg(c_canvas, options) {
                let {x_start_pos, x_end_pos, timeData, data, yMax, rhythms} = {...options};
                this.drawClickEcg(c_canvas, x_start_pos, x_end_pos, timeData, yMax);
            },
            drawClickEcg(c_canvas, x_start_pos, x_end_pos, timeData, yMax) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.font = "8pt Calibri";
                context.fillStyle = '#000';
                // 绘制x,y轴
                let height = this.canvasWidth - 34;
                context.moveTo(x_start_pos, height);
                context.lineTo(x_start_pos, 10);
                context.moveTo(x_start_pos, height);
                context.lineTo(x_end_pos, height);
                //画坐标轴的单位
                context.fillText('(ms)', 45, 20);
                context.fillText('(ms)', x_end_pos + 15, height);
                let yHeight = this.canvasWidth - 44;
                // 绘制y轴click
                for (let y = yMax; y >= 0; y -= 500) {
                    context.moveTo(x_start_pos, 10 + (yMax - y) * (yHeight / yMax));
                    context.lineTo(x_start_pos - 6, 10 + (yMax - y) * (yHeight / yMax));
                    if (y % 1000 === 0) {
                        if (y > 0) {
                            context.fillText(y, x_start_pos - 32, 13 + (yMax - y) * (yHeight / yMax));
                        } else {
                            context.fillText(y, x_start_pos - 14, 13 + (yMax - y) * (yHeight / yMax));
                        }
                    }
                }
                //                绘制x轴click
                for (let x = 0; x < timeData.length; x++) {
                    let xPos = x_start_pos + x * (x_end_pos - x_start_pos) / 6;
                    if (x === 0) continue;
                    context.moveTo(xPos, height - 5);
                    context.lineTo(xPos, height);
                    if (timeData[x] % 1000 === 0) {
                        context.fillText(timeData[x], xPos - 12, this.canvasWidth - 24);
                    }
                }
                context.stroke();
                context.closePath();
            },
        }
    }
</script>
<style scoped>
    #showCnavasBox {
        cursor: crosshair;
    }

    #RRIntervalCanvas1 {
        transform: translate(0, 0);
    }

    #tempCanvas {
        transform: translate(0, 0);
    }
</style>