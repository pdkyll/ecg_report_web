import {mapState, mapMutations, mapActions} from 'vuex';
import {FastData} from '../../common/ecg_get_fast_data';
import Util from '../../common/util';

export default {
    data: function () {
        return {
            isClearState: false,
            slideEmitPosition: -1,
            halfEmitPosition: -1,
            changeFlag: 1, // 1表示是切換心搏類型或者是切換當天數據或者是其他页面修改数据后返回导致showData改变 0表示是通过缩略图及十秒心电修改心搏导致showData改变 2模板修正时通过movetoTemplate导致showData改变
            selectArrEcg: new Set(),
            showPosition: -1,
            halfMinutePosition: -1,
            tenSecondPosition: -1,
            pageLoading: false,
            isShowBottom: true,
            showData: [],
            currentBeatType: '',
            firstLoading: true,
            fastData: null,
            selectType: 'ALL',
            selectDate: ''
        };
    },
    computed: {
        ...mapState('ecgView', {
            showEmpty: state => state.showEmpty,
            tagChangeState: state => state.tagChangeState,
            selectComponent: state => state.selectComponent,
            perDateData: state => state.perDateData,
            currentDate: state => state.currentDate,
            redrawState: state => state.redrawState,
            ecgLoader:state=>state.ecgLoader,
            samplingRate:state=>state.samplingRate,
            samplingFrequency:state=>state.samplingFrequency
        })
    },
    watch: {
        redrawState: {
            immediate: true,
            handler() {
                if (this.redrawState[this.tagStateIndex] && this.selectComponent === this.componentName) {
                    this.refreshUI();
                }
            },
            deep: true,
        },
        tagChangeState: {
            immediate: true,
            handler() {
                if (this.tagChangeState[this.tagStateIndex] && this.selectComponent === this.componentName) {
                    if (this.selectComponent !== 'main') this.initData();
                }
            },
            deep: true,
        },
        showPosition: {
            handler(newValue, oldValue) {
                if (this.selectComponent === this.componentName) {
                    if(this.showPosition!==-2 && this.showPosition != -1){
                        this.isClearState = false;
                        this.$refs.tenSecond.getBeatEcg(this.showPosition);
                    } else if (this.showPosition === -1) {
                        this.isClearState = true;
                        this.$refs.tenSecond.clear()
                    }
                    this.halfMinutePosition = this.showPosition;
                }
            }
        },
        showData() {
            if (this.showData.length === 0) {
                this.showPosition = -1
            }
        },
        selectComponent() {
            if (this.selectComponent === this.componentName) {
                if (this.tagChangeState[this.tagStateIndex]) {
                    this.initData();
                    this.$refs.tenSecond.updateVisibleData();
                    this.$refs.tenSecond.updateTags();
                }
                if (this.redrawState[this.tagStateIndex]) {
                    if (this.selectComponent === 'scatter') {
                        this.$refs.scatterBlockView.clearAllLayer();
                        this.$refs.tenSecond.init(true);
                    }
                    if (this.selectComponent === 'lineBlock') {
                        this.initStatusHistogram();
                        this.$refs.tenSecond.init(true);
                    }
                    this.changeFlag = 1
                    this.refreshUI();
                    // 当其他页面心电修改后可能导致十秒及三十秒心电修改 重置十秒和三十秒心电图形
                }
            }
        }
    },
    methods: {
        ...mapActions('ecgView', [
            'changeVSTagData'
        ]),
        ...mapMutations('ecgView',
            [
                'changeVSCountOptions',
                'changePerDayData',
                'changeTagState',
                'changeViewLoadingState',
                'changeCurrentDateTags',
                'changeRedrawState'
            ]
        ),
        tagsChange(data) {
            this.$refs.halfMinuteEcg.setRhythmData(data)
        },
        // 根据十秒心电当前开始位置跳转到整体报告对应处闪烁
        goToMain() {
            this.$parent.tabSelect = '1'
            let obj = this.$refs.tenSecond.returnBeat();
            this.$parent.changeShowComponent(obj)
        },
        handleChangePageState() {
            this.changeFlag = 0
        },
        // 缩略图组件修改心拍时 取消十秒心电选中心拍 避免同时修改
        resetTenEcg() {
            this.$refs.tenSecond.reset({keyCode: 27});
        },
        // 进度条修改十秒及三十秒组件
        changePosition(val) {
            this.tenSecondPosition = val
            this.isClearState = false;
            this.slideEmitPosition = val
            this.halfMinutePosition = val + 5120/2;
        },
        // 三十秒心电改变十秒心电显示的回调
        curentActiveRange(val) {
            this.halfEmitPosition = val.range.start
            this.isClearState = false;
            this.tenSecondPosition = val.range.start
        },
        // 十秒心电的起始点改变 改变进度条当前position
        ecgChange(val) {
            if (val !== this.slideEmitPosition) {
                this.$refs.slider.changeValue(val);
            }
            if (this.halfEmitPosition !== val && this.halfMinutePosition!== -1) { //当十秒当前emit出的位置与之前三十秒让十秒改变emit出的位置不一样时 才改变三十秒心电位置
                this.halfMinutePosition = val + 5120/2;
            }
        },
        // 修改心拍后保留页码
        beatChange() {
            this.changeFlag = 0
        },
        hasOperate() {
            if (this.$refs.ecgFragments) {
                this.$refs.ecgFragments.clearSelectArr();
                this.$refs.ecgFragments.clearShowPosition();
                this.$refs.ecgFragments.isShowTempPopup = false
            }
            if(this.$refs.overlayMain){
                this.handleUntyingEvent();
            }
        },
        /**
         * 更新UI视图，只需要更新showData， vsCount在切换date的时候就已经计算完毕了
         */
        refreshUI() {
            let date = this.currentDate.split(' ')[0].split('/').join('-');
            this.changeViewLoadingState(true);
            let setTime = 0;
            if (this.selectComponent === 'afView') setTime = 500;
            setTimeout(() => {
                let tempArr = Object.assign([], this.redrawState);
                tempArr[this.tagStateIndex] = false;
                this.changeRedrawState(tempArr);
                if (this.selectComponent === 'afView') {
                    this.changeCurrentDateTags(this.perDateData[date].data);
                } else {
                    this.caclShowData();
                }
                this.firstLoading = false;
                if (!this.$refs.ecgFragments) {
                    this.changeViewLoadingState(false);
                }
            }, setTime)
        },
        /**
         * 初始化数据，在初次加载或者切换日期的时候触发
         */
        initData() {
            if (this.showEmpty) return;
            let date = this.currentDate.split(' ')[0].split('/').join('-');
            if (this.firstLoading) {
                if (this.perDateData[date] !== undefined) {
                    this.refreshUI();
                } else {
                    this.getCurrentData(date);
                }
            } else {
                this.getCurrentData(date);
            }
        },
        getCurrentData(date) {
            setTimeout(() => {
                this.changeViewLoadingState(true);
                this.getCurrentDateTags(date, () => {
                    this.changeRedrawState(new Array(this.tagChangeState.length).fill(true));
                    this.changeTagState(new Array(this.tagChangeState.length).fill(false));
                    /**
                     * 更新vsTagData
                     */
                    this.changeVSTagData(date);
                    this.changeVSCount();
                    this.firstLoading = false;
                });
            }, 0);
        },
        /**
         * 修改更新状态
         */
        upDateChangeState() {
            let freshStateArray = new Array(this.tagChangeState.length).fill(true);
            this.changeTagState(freshStateArray);
        },
        handleChangeSize(val) {
            this.isShowBottom = val
        },
        clearSelectArr() {
            this.$refs.ecgFragments.clearSelectArr();
        },
        /**
         * 改变选择心电，变换showPosition
         * @param val
         */
        handleSelectFragment(val) {
            this.showPosition = val.showPosition
        },
        /**
         * 修改展示的vsData数据
         */
        changeVSCount() {
            let tempArr = [];    // 用于展示的下拉框
            let tagObj = {};    //获取vuex的clone数据
            let date = this.currentDate.split(' ')[0].split('/').join('-');
            if (this.perDateData[date] !== undefined) {
                if (this.perDateData[date].tag) {
                    tagObj = Object.assign({}, this.perDateData[date].tag)
                }
            }
            let beatsData = {
                N: Util.flatArray(tagObj.nTagData).length,
                V: Util.flatArray(tagObj.vTagData).length,
                S: Util.flatArray(tagObj.sTagData).length,
                Q: Util.flatArray(tagObj.qTagData).length
            };
            Object.keys(tagObj).map(item => {
                let tempFlatArray = Util.flatArray(tagObj[item]);
                let type = item.split('Tag')[0].toUpperCase();
                if (type === 'ALL') {
                    tempFlatArray.length ? tempArr.push({label: `全部(${tempFlatArray.length})`, value: type}) : null
                } else {
                    if (type !== 'N' && type !== 'V' && type !== 'S' && type !== 'Q') {
                        tempFlatArray.length ? tempArr.push({
                            label: `${type}(${tempFlatArray.length})`,
                            value: type
                        }) : null
                    }
                }
            });
            let selectTypeOption = tempArr;
            this.changeVSCountOptions({
                beatsData,
                selectTypeOption
            })
        },
        /**
         * 获取当天数据
         * @param index
         */
        getCurrentDateTags(currentDate, callback = null) {
            let report_id = localStorage.getItem('report_id');
            setTimeout(
                () => {
                    this.fastData = null;
                    this.fastData = new FastData(
                        report_id,
                        currentDate,
                        () => {
                            let tags = this.fastData.getFastData();
                            this.changePerDayData({
                                date: currentDate,
                                tagData: tags,
                                tag: {},
                                changed: true
                            });
                            if (callback) callback();
                        }
                    );
                    this.fastData.getAjaxFastData();
                },
                0
            );
        },
        /**
         * 计算获取展示数据
         */
        caclShowData() {
            let showData = [];
            let date = this.currentDate.split(' ')[0].split('/').join('-');
            if (this.perDateData[date] !== undefined) {
                if (this.selectComponent === 'lineBlock') {
                    showData = this.perDateData[date]['tag'][`${this.selectType.toLowerCase()}TagData`];
                } else {
                    showData = Util.flatArray(this.perDateData[date]['tag'][`${this.selectType.toLowerCase()}TagData`]);
                }
            }
            this.showData = showData.sort((a, b) => a.p - b.p);
        },
        /**
         * 初始化changeFlag
         */
        resetChangeFlag() {
            this.changeFlag = 1;
        },
        updateTags() {
            this.$refs.tenSecond.updateTags();
        },
        updateVisibleData(from, to) {
            this.$refs.tenSecond.updateVisibleData(from, to);
        }
    },
    mounted() {

        this.selectDate = this.currentDate;
    },
    beforeRouteLeave() {
        this.fastData.clearFastData();
    },
    beforeDestroy() {
        /**
         * 在离开报告列表页时，需要将状态初始化
         */
        this.changeRedrawState(new Array(this.tagChangeState.length).fill(false));
        this.changeTagState(new Array(this.tagChangeState.length).fill(true));
    }
};