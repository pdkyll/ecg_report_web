<template>
    <div id="myChart" style="width: 1200px; height: 300px;">

    </div>
</template>
<script>
    import echarts from 'echarts';
    import {mapState, mapMutations} from 'vuex';
    export default {
        name: 'echartsShowBox',
        data () {
            return {
                outputS: {},
                outputV: {},
                degree: 25
            }
        },
        computed: {
            ...mapState('paperBlock', {
                selectArray: state => state.selectArray,
            }),
            ...mapState('ecgView', {
                ecgFastData: state => state.ecgFastData,
            }),
        },
        mounted() {
            this.changeType('lineBlock');
            this.getOutput();
            this.drawEcg();
        },
        watch: {
        },
        methods: {
            ...mapMutations('paperBlock', [
                'changeSelected',
                'changeType'
            ]),
            getOutput() {
                for(let i = 0, len = this.ecgFastData.length; i<len; i++) {
                    let rrParse = 0;
                    if (this.ecgFastData[i+1]) {
                        if(this.ecgFastData[i+1].t === 'V') {
                            rrParse = parseInt((this.ecgFastData[i+1].p - this.ecgFastData[i].p) / 512 * 1000);
                            if(this.outputV[parseInt(rrParse/this.degree)]) {
                                this.outputV[parseInt(rrParse/this.degree)].push(this.ecgFastData[i+1].p);
                            } else {
                                this.outputV[parseInt(rrParse/this.degree)] = [this.ecgFastData[i+1].p];
                            }
                        }
                        if(this.ecgFastData[i+1].t === 'S') {
                            rrParse = parseInt((this.ecgFastData[i+1].p - this.ecgFastData[i].p) / 512 * 1000);
                            if(this.outputS[parseInt(rrParse/this.degree)]) {
                                this.outputS[parseInt(rrParse/this.degree)].push(this.ecgFastData[i+1].p);
                            } else {
                                this.outputS[parseInt(rrParse/this.degree)] = [this.ecgFastData[i+1].p];
                            }
                        }
                    }
                }
            },
            drawEcg() {
                let myChart = echarts.init(document.getElementById('myChart'));
                let xData = [];
                let data = [];
                let max = 0;
                for(let i in this.outputS) {
                    if(i > max) {
                        max = i;
                    }
                }
                for(let t = 0; t <= max; t++) {
                    xData.push(t * this.degree + 'ms-' + (t+1) * this.degree + 'ms');
                   if (this.outputS[t]) {
                       data.push(this.outputS[t].length);
                   } else {
                       data.push(0)
                   }
                }
                let option = {
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: {
                            type: 'cross',
                            label: {
                                backgroundColor: '#283b56'
                            }
                        }
                    },
                    grid: {
                        x: 40,
                        y: 10,
                        x2: 10,
                        y2: 40
                    },
                    xAxis: {
                        data: xData,
                        axisLabel: {
                            inside: true,
                            textStyle: {
                                color: '#fff'
                            }
                        },
                        axisTick: {
                            show: false
                        },
                        axisLine: {
                            show: false
                        },
                        z: 10
                    },
                    yAxis: {
                        axisLine: {
                            show: false
                        },
                        axisTick: {
                            show: false
                        },
                        axisLabel: {
                            textStyle: {
                                color: '#999'
                            }
                        }
                    },
                    dataZoom: [
                        {
                            type: 'inside'
                        }
                    ],
                    series: [
                        {
                            type: 'bar',
                            itemStyle: {
                                normal: {
                                    color: new echarts.graphic.LinearGradient(
                                        0, 0, 0, 1,
                                        [
                                            {offset: 0, color: '#83bff6'},
                                            {offset: 0.5, color: '#188df0'},
                                            {offset: 1, color: '#188df0'}
                                        ]
                                    )
                                },
                                emphasis: {
                                    color: new echarts.graphic.LinearGradient(
                                        0, 0, 0, 1,
                                        [
                                            {offset: 0, color: '#f7dc0f'},
                                            {offset: 0.7, color: '#f7e464'},
                                            {offset: 1, color: '#f6e4ae'}
                                        ]
                                    )
                                }
                            },
                            data: data
                        }
                    ]
                };
                myChart.setOption(option);
                myChart.on('click', (parms) => {
                    let name = parms.name;
                    let index = Number(name.slice(0, name.indexOf('ms'))) / 25;
                    this.changeSelected(this.outputS[index]);
                });
            }
        }
    }
</script>
<style scoped>

</style>