// initial state
// shape: [{ id, quantity }]
import API from "../../api/api_ecg_view";
import Util from "../../common/util";
import filterBeats from '../../common/filterBeats';

const state = {
    wholeViewLoading: false,
    gainSelected: 10,
    rhythmTypeSelected: '',
    dayStartIndex: 0,
    ecgStartTime: '',
    ecgEndTime: '',
    clickDateState: false,//区别是点击日期卡片还是心电滚动导致的切换日期
    basicInfo: {
        age: 0,
        gender: '',
        fullName: '',
        record_begin_time: '',
        record_end_time: '',
        phone: '',
        address: '',
        company: '',
        idNumber: '',
        deviceNumber: '',
        bloodPressure: 0,
        bloodPressureHigh: 0,
        isSmoke: false,
        pymptom: '',
        sickHistory: '',
        medicalCase: '',
        reportAttachmentUrls: [],
        symbols: [500, 50000, 10000000]
    },
    ecgDataLoading: false,
    refreshState: false,
    ecgFastData: null,
    fastDataLoading: false,
    changeReset: false,
    selectMain: true,
    selectComponent: 'main',
    currentDateTags: [],
    pageChanged: false,
    mainPageLoading: false,
    lastBlockIndex: 0,//最大数据块索
    startBlockIndex: 0, // 当前报告最小的索引块
    inPic: false,
    RRShowState: false,
    rhythmTypeSelectDisabled: false,
    freshPageScatter: false,
    freshPageLineBlock: false,

    //最新用到的vuex
    tagChangeState: [true, true, true, true, true, true, true], // 整体页面 散点图 直方图 房扑房颤 叠加图 模板修正 心律失常
    redrawState: [false, false, false, false, false, false, false], //是否需要重绘UI
    validDates: [],//报告的所有日期
    datesIsContainData: [],//报告的所有日期是否有心电信号，如false则无心电
    perDateData: {},
    currentDate: '',//报告的选中日期
    dateIndex: 0,//报告选中日期的索引
    showEmpty: false,
    vsCountOptions: {},
    samplingFrequency: 512,//心电的原始采样率
    isMainChange: false, // 记录其他页面的心电图改变，作为是否重新加载整体报告页的标志
    ecgLoader:null,//加载原始心电的公用实例
    samplingRate:128,//客户端缓存心电数据的采样率
};

// getters
const getters = {};
function ruleAnalys(commit, state, date) {
    let viewDate = date;
    let ecgFastData = state.perDateData[viewDate].data || [];
    let filters = [
        'R',
        'V',
        'S',
        'N',
        'Q',
        'N,N',
        'N,V',
        'N,S',
        'N,R',
        'V,V',
        'V,N',
        'V,S',
        'V,R',
        'S,S',
        'S,N',
        'S,V',
        'S,R',
        'R,R',
        'R,N',
        'R,S',
        'R,V',
        'S,S,S',
        'V,V,V'
    ];
    let filterMap = {
        'R': 'allTagData',
        'V': 'vTagData',
        'S': 'sTagData',
        'N': 'nTagData',
        'Q': 'qTagData',
        'N,N': 'nnTagData',
        'N,V': 'nvTagData',
        'N,S': 'nsTagData',
        'N,R': 'nrTagData',
        'V,V': 'vvTagData',
        'V,N': 'vnTagData',
        'V,S': 'vsTagData',
        'V,R': 'vrTagData',
        'S,S': 'ssTagData',
        'S,N': 'snTagData',
        'S,V': 'svTagData',
        'S,R': 'srTagData',
        'R,R': 'rrTagData',
        'R,N': 'rnTagData',
        'R,S': 'rsTagData',
        'R,V': 'rvTagData',
        'S,S,S': 'sssTagData',
        'V,V,V': 'vvvTagData'
    };
    let retObj = {};
    let result = filterBeats.filterBeats(ecgFastData, filters);
    for (let v in result) {
        retObj[filterMap[v]] = result[v];
    }
    let sendMainData = {
        date: viewDate,
        tagData: ecgFastData,
        tag: retObj,
        changed: false
    };
    commit('changePerDayData', sendMainData);
    commit('changeReset', !state.changeReset);
}

// actions
const actions = {
    getDayStartIndex({commit}, params) {
        API.getDayStartEcg(params).then(data => {
            commit('changeDayStartIndex', data);
        })
    },
    changeVSTagData({commit, state}, date) {
        ruleAnalys(commit, state, date);
    },
    overPageReset({commit, state}) {
        let temp = !state.changeReset;
        commit('changeReset', temp);
    }
};

// mutations
const mutations = {
    /**
     * 整体报告页面是否修改
     * @param state
     * @param data
     */
    changeMainState(state, data) {
        state.isMainChange = data;
    },
    /**
     * 是否显示空值
     * @param state
     * @param data
     */
    changeShowEmpty(state, data) {
        state.showEmpty = data;
    },
    /**
     * 修改选中类型
     * @param state
     * @param type
     */
    changeSelectType(state, type) {
        state.selectType = type
    },
    /**
     * 修改vsCount
     * @param state
     * @param option
     */
    changeVSCountOptions(state, option) {
        state.vsCountOptions = option
    },
    changeDateIndex(state, data) {
        state.dateIndex = data;
    },
    changeViewLoadingState(state, data) {
        state.wholeViewLoading = data;
    },
    changeGainSelected(state, data) {
        state.gainSelected = data;
    },
    changeTagState(state, data) {
        state.tagChangeState = data;
    },
    changeRedrawState(state, data) {
        state.redrawState = data;
    },
    changeReset(state, data) {
        state.changeReset = data;
    },
    changeInPic(state, data) {
        state.inPic = data;
    },
    changePerDayData(state, data) {
        let date = data.date;
        let tagData = data.tagData;
        let tag = data.tag;
        state.perDateData = {};
        state.perDateData[date] = {
            data: tagData,
            tag: tag,
            changed: data.changed
        };
    },
    clearPerData(state, data) {
        state.perDateData = data;
    },
    changeSelectComponent(state, data) {
        state.selectComponent = data;
    },

    changeSelectMain(state, data) {
        state.selectMain = data;
    },

    changeFastData(state, data) {
        state.ecgFastData = data;
    },
    changeRhythmTypeSelected(state, data) {
        state.rhythmTypeSelected = data;
    },
    changeDayStartIndex(state, data) {
        state.dayStartIndex = data;
    },
    changeCurrentDate(state, data) {
        state.currentDate = data;
    },
    changeClickDateState(state, data) {
        state.clickDateState = data;
    },
    changeEcgStartTime(state, data) {
        state.ecgStartTime = data;
    },
    changeEcgEndTime(state, data) {
        state.ecgEndTime = data;
    },
    changeBasicInfo(state, data) {
        state.basicInfo = data;
    },
    changeEcgDataLoading(state, data) {
        state.ecgDataLoading = data;
    },
    changeUpdateTagQState2(state, data) {
        state.updateTagQState2 = data;
    },
    changeRefreshState(state, data) {
        state.refreshState = data;
    },
    changeValidDates(state, data) {
        state.validDates = data.map(v => v.day.replace(/\-/g, '/'));
        state.datesIsContainData = data.map(v => v.isContainData);
    },
    changeDateIsContainData(state, data) {
        state.datesIsContainData = data;
    },
    changeCurrentDateTags(state, data) {
        state.currentDateTags = data;
    },
    changeLastBlockIndex(state, data) {
        state.lastBlockIndex = data;
    },
    changeStartBlockIndex(state, data) {
        state.startBlockIndex = data;
    },
    changeRRShowState(state, data) {
        state.RRShowState = data;
    },
    changeRhythmTypeSelectDisabled(state, data) {
        state.rhythmTypeSelectDisabled = data;
    },
    changeEcgLoader(state,data){
        state.ecgLoader=data;
    },
    resetEcgViewModule(state, data) {
        Util.resetVuexState(state, data);
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
