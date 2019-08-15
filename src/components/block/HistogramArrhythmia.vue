<template>
    <section v-loading="histogramLoading" style="position: relative">
        <section class="histogramArrhythmia"
                 style="position: absolute; height: 36px; line-height: 36px; left: 170px; z-index: 2000">
            <el-select v-show="radio === '0'" v-model="selectModel" placeholder="请选择" @change="changeShowData"
                       style="vertical-align: bottom; margin-left: 20px;width: 140px;">
                <el-option
                        v-for="item in options"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value">
                </el-option>
            </el-select>
            <el-select v-show="radio === '1'" v-model="selectModel2" placeholder="请选择" @change="changeShowData2"
                       style="vertical-align: bottom; margin-left: 20px;width: 140px;">
                <el-option
                        v-for="item in options2"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value">
                </el-option>
            </el-select>
            <el-checkbox v-model="exceptQ" @change="resetAllData" style="margin-left: 20px" :disabled="selectType === 'Q'">过滤节拍Q</el-checkbox>
        </section>
        <el-tabs v-model="radio">
            <el-tab-pane label="间期">
                <HistogramBlock
                        ref="lineBlockView0"
                        :keyItem="0"
                        :showData="showData"
                        :canvasWidth="canvasLineBlockWidth"
                        :canvas-height="canvasLineBlockHeight"
                        :changeFlag="changeFlag"
                        :onSelectChange="true"
                        @initStatus="initStatusHistogram"
                        @changeSelectArray="changeSelectArray"
                        @resetChangeFlag="resetChangeFlag"
                        @changeSelectData="changeSelectData"
                        @clearOtherSelect="clearLineBlock(1,2)"
                />
            </el-tab-pane>
            <el-tab-pane label="间期比">
                <section style="display: flex; justify-content: space-around">
                    <section style="position: relative">
                        <p style="position: absolute;left: 40px; top: 0;z-index: 2000; font-size: 18px">
                            {{currentTypeOption2}}</p>
                        <HistogramBlock
                                ref="lineBlockView1"
                                :showData="showData2"
                                :keyItem="1"
                                :canvasWidth="canvasLineBlockWidth/2"
                                :jianqi="true"
                                :changeFlag="changeFlag"
                                :onSelectChange="true"
                                :canvas-height="canvasLineBlockHeight"
                                @initStatus="initStatusHistogram"
                                @changeSelectData="changeSelectData"
                                @changeSelectArray="changeSelectArray"
                                @resetChangeFlag="resetChangeFlag"
                                @clearOtherSelect="clearLineBlock(0,2)"
                        />
                    </section>
                    <section style="position: relative">
                        <p style="position: absolute;left: 40px; top: 0;z-index: 2000; font-size: 18px">
                            {{`${currentType}-${currentType}-${currentType}`}}</p>
                        <HistogramBlock
                                ref="lineBlockView2"
                                :showData="showData3"
                                :keyItem="2"
                                :canvasWidth="canvasLineBlockWidth/2"
                                :jianqi="true"
                                :changeFlag="changeFlag"
                                :onSelectChange="true"
                                :canvas-height="canvasLineBlockHeight"
                                @changeSelectData="changeSelectData"
                                @initStatus="initStatusHistogram"
                                @changeSelectArray="changeSelectArray"
                                @resetChangeFlag="resetChangeFlag"
                                @clearOtherSelect="clearLineBlock(0,1)"
                        />
                    </section>
                </section>
            </el-tab-pane>
        </el-tabs>
    </section>
</template>
<script>
    import HistogramBlock from '../commonBlock/HistogramBlock';
    import Util from '../../common/util';
    import {mapState} from 'vuex';

    export default {
        name: 'HistogramArrhythmia',
        components: {
            HistogramBlock
        },
        props: {
            getData: {                       //传入数据
                type: Array,
                default: []
            },
            initStatusHistogram: {          //初始化直方图
                type: Function,
                default: null
            },
            changeSelectArray: {            //修改选中数据
                type: Function,
                default: null
            },
            resetChangeFlag: {              //重置changeFlag
                type: Function,
                default: null
            },
            canvasLineBlockHeight: {        //canvas放大缩小
                type: Number,
                default: 200
            },
            canvasLineBlockWidth: {
                type: Number,
                default: 1000
            },
            selectType: {                   //当前选择类型
                type: String,
                defalut: 'N'
            },
            selectNumber: {                 //选中模板编号
                type: String,
                default: ''
            },
            changeFlag: {
                type: Number,
                default: 1
            }
        },
        data() {
            return {
                radio: '0',

                showData: [],
                showData2: [],
                showData3: [],

                selectModel: '',
                selectModel2: '',

                options: [],
                options2: [],

                caclData: [],
                caclData2: [],
                selectData: [],
                exceptQ: false,
                histogramLoading: false,
                recData: [],
                clear: false
            }
        },
        computed: {
            ...mapState('ecgView', {
                perDateData: state => state.perDateData,
                currentDate: state => state.currentDate,
            }),
            currentFlatData() {
                let date = this.currentDate.split(' ')[0].split('/').join('-');
                return Util.flatArray(this.perDateData[date].tag.allTagData).sort((a, b) => a.p - b.p);
            },
            currentType() {
                return this.selectType + this.selectNumber;
            },
            currentTypeOption2() {
                let showOption = this.options2.filter(item => item.value === this.selectModel2);
                if (showOption.length) {
                    return showOption[0].label;
                }
                return '';
            }
        },
        watch: {
            getData() {
                // this.clearAllInSelect();
                this.caclAllData();
            },
            selectType() {
                this.selectModel = this.options[0].value;
            }
        },
        methods: {
            resetAllData() {
                if (this.selectModel.indexOf('q') !== -1) {
                    this.selectModel = null;
                }
                if (this.selectModel2.indexOf('q') !== -1) {
                    this.selectModel2 = null;
                }
                this.caclAllData();
            },
            caclAllData() {
                this.histogramLoading = true;
                // 计算间期数据
                this.caclData = this.judgeOptionsWithInterphase(this.getData);
                this.options = this.createOptions(this.selectType.toLowerCase(), this.selectNumber);
                this.selectModel = this.selectModel || this.options[0].value;
                this.showData = this.caclData[this.selectModel];
                //计算间期比数据1
                this.caclData2 = this.judgeOptionsWidthIntervalRatio(this.getData);
                this.options2 = this.createOptions2(this.selectType.toLowerCase(), this.selectNumber);
                this.selectModel2 = this.selectModel2 || this.options2[0].value;
                this.showData2 = this.caclData2[this.selectModel2];
                //计算间期比数据2
                this.showData3 = this.judgeOptionsWidthSelf(this.getData);
                this.histogramLoading = false;
            },
            changeSelectData(data, clear) {
                if (clear) {
                    this.clear = true;
                }
                if (this.clear) {
                    this.selectData = [];
                } else {
                    if (data.length) {
                        this.selectData = data;
                    }
                }
            },
            getSelectData(positions) {
                this.histogramLoading = true;
                // 计算间期数据
                this.caclData = this.judgeOptionsWithInterphase(positions);
                this.options = this.createOptions(this.selectType.toLowerCase(), this.selectNumber);
                this.selectModel = this.selectModel || this.options[0].value;
                this.showData = this.caclData[this.selectModel];
                this.$refs.lineBlockView0.caclSendData(this.showData);
                //计算间期比数据1
                this.caclData2 = this.judgeOptionsWidthIntervalRatio(positions);
                this.options2 = this.createOptions2(this.selectType.toLowerCase(), this.selectNumber);
                this.selectModel2 = this.selectModel2 || this.options2[0].value;
                this.showData2 = this.caclData2[this.selectModel2];
                this.$refs.lineBlockView1.caclSendData(this.showData2);
                //计算间期比数据2
                this.showData3 = this.judgeOptionsWidthSelf(positions);
                this.$refs.lineBlockView2.caclSendData(this.showData3);
                this.histogramLoading = false;
                this.clear = false;
                return this.selectData
            },
            clearAllInSelect() {
                this.radio = '0';
                this.selectModel = '';
                this.selectModel2 = '';
                this.exceptQ = false;
                this.$refs.lineBlockView0.initEcharts();
                this.$refs.lineBlockView1.initEcharts();
                this.$refs.lineBlockView2.initEcharts();
            },
            /**
             * 计算当前的select组件的option 并选中第一个option
             * @returns {{nn: Array, vn: Array, sn: Array, rn: Array, qn: Array}}
             */
            judgeOptionsWithInterphase(data) {
                let types = ['r', 'n', 'v', 's', 'q'];
                let retObj = {};
                let selectType = this.selectType.toLowerCase();
                types.map(item => retObj[item + selectType] = []);
                data.map(item => {
                    let perRate = Math.floor(item.x / 25);
                    if (perRate >= 120) perRate = 120;
                    let currentIndex = this._binarySearchPos(item.p, this.currentFlatData);
                    let lastObj = this.currentFlatData[currentIndex - 1];
                    if (lastObj) {
                        switch (lastObj.t) {
                            case 'N':
                                this.judgeChangeData(retObj, perRate, `n${selectType}`, item);
                                this.judgeChangeData(retObj, perRate, `r${selectType}`, item);
                                break;
                            case 'V':
                                this.judgeChangeData(retObj, perRate, `v${selectType}`, item);
                                this.judgeChangeData(retObj, perRate, `r${selectType}`, item);
                                break;
                            case 'S':
                                this.judgeChangeData(retObj, perRate, `s${selectType}`, item);
                                this.judgeChangeData(retObj, perRate, `r${selectType}`, item);
                                break;
                            case 'Q':
                                if (!this.exceptQ) {
                                    this.judgeChangeData(retObj, perRate, `q${selectType}`, item);
                                    this.judgeChangeData(retObj, perRate, `r${selectType}`, item);
                                }
                                break;
                            default:
                                break;
                        }
                    } else {
                        this.judgeChangeData(retObj, perRate, `r${selectType}`, item);
                    }
                });
                return retObj;
            },
            _binarySearch(index, data) {
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = Math.floor((l + r) / 2);
                    let currentP = data[mid].p;
                    if (currentP < index) {
                        l = mid + 1;
                    } else if (currentP > index) {
                        r = mid - 1;
                    } else {
                        return true;
                    }
                }
                return false;
            },
            _binarySearchPos(pos, data) {
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = Math.floor((l + r) / 2);
                    let currentP = data[mid].p;
                    if (currentP < pos) {
                        l = mid + 1;
                    } else if (currentP > pos) {
                        r = mid - 1;
                    } else {
                        return mid;
                    }
                }
                return -1;
            },
            /**
             * 计算间期比
             */
            judgeOptionsWidthIntervalRatio(data) {
                let currentSelectType = this.selectType.toLowerCase();
                let types = [`rr${currentSelectType}`, `rn${currentSelectType}`, `rv${currentSelectType}`, `rs${currentSelectType}`, `rq${currentSelectType}`];
                let retObj = {};
                types.map(item => retObj[item] = []);
                data.map(item => {
                    let currentIndex = this._binarySearchPos(item.p, this.currentFlatData);
                    let lastObj = this.currentFlatData[currentIndex - 1];
                    let lastSecObj = this.currentFlatData[currentIndex - 2];
                    if (lastObj && lastSecObj) {
                        if (!(lastSecObj.t === 'Q' && this.exceptQ)) {
                            let inSelectType = this._binarySearch(lastObj.p, data);
                            let perX = Math.floor((item.p - lastObj.p) / (lastObj.p - lastSecObj.p) * 100 / 10) * 10;
                            if (perX > 1000) perX = 1000;
                            if (!inSelectType) {
                                this.judgeChangeData(retObj, perX, `rr${currentSelectType}`, item);
                            }
                            switch (lastObj.t) {
                                case 'N':
                                    this.judgeChangeData(retObj, perX, `rn${currentSelectType}`, item);
                                    break;
                                case 'V':
                                    this.judgeChangeData(retObj, perX, `rv${currentSelectType}`, item);
                                    break;
                                case 'S':
                                    this.judgeChangeData(retObj, perX, `rs${currentSelectType}`, item);
                                    break;
                                case 'Q':
                                    this.judgeChangeData(retObj, perX, `rq${currentSelectType}`, item);
                                    break;
                                default:
                                    break;
                            }
                        }
                    }
                });
                return retObj;
            },
            judgeOptionsWidthSelf(data) {
                let retArr = [];
                for (let i = 2; i < data.length; i++) {
                    let first = data[i - 2];
                    let second = data[i - 1];
                    let third = data[i];
                    if (third.i - first.i === 2) {
                        let perX = Math.floor((third.p - second.p) / (second.p - first.p) * 100 / 10) * 10;
                        if (perX > 1000) perX = 1000;
                        if (retArr[perX]) {
                            retArr[perX].push(third);
                        } else {
                            retArr[perX] = [third];
                        }
                    }
                }
                return retArr;
            },
            /**
             * 功能函数：存储间期数据
             * @param aimObj
             * @param perRate
             * @param type
             * @param item
             */
            judgeChangeData(aimObj, perRate, type, item) {
                if (aimObj[type][perRate]) {
                    aimObj[type][perRate].push(item);
                } else {
                    aimObj[type][perRate] = [item];
                }
            },
            /**
             * 创建option函数对象,用于间期
             * @param type
             * @param number
             * @returns {{label: string, value: string}[]}
             */
            createOptions(type, number) {
                let baseObj = [{
                    value: `r${type}`,
                    label: `R-${type.toUpperCase()}${number}`
                }, {
                    value: `n${type}`,
                    label: `N-${type.toUpperCase()}${number}`
                }, {
                    value: `v${type}`,
                    label: `V-${type.toUpperCase()}${number}`
                }, {
                    value: `s${type}`,
                    label: `S-${type.toUpperCase()}${number}`
                }];
                if (!this.exceptQ) {
                    baseObj.push({
                        value: `q${type}`,
                        label: `Q-${type.toUpperCase()}${number}`
                    })
                }
                return baseObj;
            },
            /**
             * 创建option函数对象,用于间期比
             * @param type
             * @param number
             * @returns {{label: string, value: string}[]}
             */
            createOptions2(type, number) {
                let currentSelectType = type.toUpperCase() + number;
                let types = [`R-(R≠${currentSelectType})-${currentSelectType}`, `R-N-${currentSelectType}`, `R-S-${currentSelectType}`, `R-V-${currentSelectType}`, `R-Q-${currentSelectType}`];

                let baseObj = [{
                    value: `rr${type}`,
                    label: `R-(R≠${currentSelectType})-${currentSelectType}`
                }, {
                    value: `rn${type}`,
                    label: `R-N-${currentSelectType}`
                }, {
                    value: `rv${type}`,
                    label: `R-V-${currentSelectType}`
                }, {
                    value: `rs${type}`,
                    label: `R-S-${currentSelectType}`
                }];
                if (!this.exceptQ) {
                    baseObj.push({
                        value: `rq${type}`,
                        label: `R-Q-${currentSelectType}`
                    })
                }
                return baseObj;
            },
            changeShowData(val) {
                this.$refs.lineBlockView0.initEcharts();
                this.showData = this.caclData[val];
                this.changeSelectArray(Util.flatArray(this.showData).sort((a, b) => a.p - b.p));
            },
            changeShowData2(val) {
                this.$refs.lineBlockView1.initEcharts();
                this.showData2 = this.caclData2[val];
                this.changeSelectArray(Util.flatArray(this.showData2).sort((a, b) => a.p - b.p));
            },
            clearLineBlock(index1, index2) {
                this.$refs[`lineBlockView${index1}`].initEcharts();
                this.$refs[`lineBlockView${index1}`].drawEchart();
                this.$refs[`lineBlockView${index2}`].initEcharts();
                this.$refs[`lineBlockView${index2}`].drawEchart();
            }
        },
    }
</script>
<style scoped lang="scss">
    .histogramArrhythmia /deep/ .el-input__inner {
        height: 36px;
        line-height: 36px;
    }
</style>