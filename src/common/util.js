/**
 * Created by jerry on 2017/4/14.
 */
var SIGN_REGEXP = /([yMdhsm])(\1*)/g
var DEFAULT_PATTERN = 'yyyy-MM-dd'

var setCookie = function (name, value, time) {
  if(time !== 0){     //当设置的时间等于0时，不设置expires属性，cookie在浏览器关闭后删除
    var expires = time;
    var date = new Date(+new Date()+expires);
    document.cookie = name + "=" + escape(value) + ";expires=" + date.toUTCString();
   }else{
    document.cookie = name + "=" + escape(value);
  }
};
var getCookie = function (name) {
    var arr;
    var reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg)) return unescape(arr[2]);
    else return null;
};
var delCookie = function (name) {
    setCookie(name, ' ', -1);
};
function padding(s, len) {
    let l = len - (s + '').length
    for (var i = 0; i < l; i++) {
        s = '0' + s
    }
    return s
};
const type = (obj) => {
    var toString = Object.prototype.toString
    var map = {
        '[object Boolean]': 'boolean',
        '[object Number]': 'number',
        '[object String]': 'string',
        '[object Function]': 'function',
        '[object Array]': 'array',
        '[object Date]': 'date',
        '[object RegExp]': 'regExp',
        '[object Undefined]': 'undefined',
        '[object Null]': 'null',
        '[object Object]': 'object'
    }
    return map[toString.call(obj)]
}
const deepCopy = (data) => {
    var t = type(data)
    var o
    var i
    var ni
    if (t === 'array') {
        o = []
    } else if (t === 'object') {
        o = {}
    } else {
        return data
    }
    if (t === 'array') {
        for (i = 0, ni = data.length; i < ni; i++) {
            o.push(deepCopy(data[i]))
        }
        return o
    } else if (t === 'object') {
        for (i in data) {
            o[i] = deepCopy(data[i])
        }
        return o
    }
}
const filterBeatByType = (tags, type) =>{
    return tags.filter(tag => {
        return JSON.parse(tag).t === type && JSON.parse(tag).d !== 2
    });
}
const flatArray = (arr) => {
    if (arr === undefined) return [];
    return arr.reduce((pre, cur) => {
        return pre.concat(cur);
    }, []);
}

const SAMPLING_RATE = 512;
function linearInterpolate(src, dst) {
    var nSrc = src.length;
    var nDst = dst.length;
    var rate = nSrc / nDst;

    for (var i = 0; i < dst.length; i++) {
        var fSrc = i * rate;
        var iSrc = Math.floor(fSrc);
        var r = fSrc - iSrc;

        dst[i] = src[iSrc] * r + src[iSrc + 1] * (1 - r);
    }
}

function resample(values, frequency) {
    var size = values.length;
    size = Math.floor(size / (frequency / SAMPLING_RATE));
    var results = new Array(size);
    linearInterpolate(values, results);

    return results;
}

export default {
    wsUrl: {
        test: 'ws://ecg-java-test.landmind.cn/join',
        release:'ws://ecg-java-release.landmind.cn/join',
        local: 'ws://' + location.host + '/join'
    },
    vTag: '#fe010f',
    sTag: '#12d726',
    nTag: '#2d2d2d',
    qTag: '#6f6f6f',
    splitNum: 3000,
    afRythmColor: '#410bff',
    aflutRythmColor: '#410bff',
    type: type,
    flatArray: flatArray,
    deepCopy: deepCopy,
    filterBeatByType: filterBeatByType,
    setCookie: setCookie,
    getCookie: getCookie,
    delCookie: delCookie,
    linearInterpolate: linearInterpolate,
    getQueryStringByName: function (name) {
        var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i')
        var r = window.location.search.substr(1).match(reg)
        var context = ''
        if (r != null) {
            context = r[2]
        }
        reg = null
        r = null
        return context === null || context === '' || context === 'undefined' ? '' : context
    },
    formatDate: {

        format: function (date, pattern) {
            pattern = pattern || DEFAULT_PATTERN
            return pattern.replace(SIGN_REGEXP, function ($0) {
                switch ($0.charAt(0)) {
                    case 'y':
                        return padding(date.getFullYear(), $0.length)
                    case 'M':
                        return padding(date.getMonth() + 1, $0.length)
                    case 'd':
                        return padding(date.getDate(), $0.length)
                    case 'w':
                        return date.getDay() + 1
                    case 'h':
                        return padding(date.getHours(), $0.length)
                    case 'm':
                        return padding(date.getMinutes(), $0.length)
                    case 's':
                        return padding(date.getSeconds(), $0.length)
                }
            })
        },
        parse: function (dateString, pattern) {
            var matchs1 = pattern.match(SIGN_REGEXP)
            var matchs2 = dateString.match(/(\d)+/g)
            if (matchs1.length === matchs2.length) {
                var _date = new Date(1970, 0, 1)
                for (var i = 0; i < matchs1.length; i++) {
                    var _int = parseInt(matchs2[i])
                    var sign = matchs1[i]
                    switch (sign.charAt(0)) {
                        case 'y':
                            _date.setFullYear(_int);
                            break
                        case 'M':
                            _date.setMonth(_int - 1);
                            break
                        case 'd':
                            _date.setDate(_int);
                            break
                        case 'h':
                            _date.setHours(_int);
                            break
                        case 'm':
                            _date.setMinutes(_int);
                            break
                        case 's':
                            _date.setSeconds(_int);
                            break
                    }
                }
                return _date
            }
            return null
        }
    },
//将Date对象转为'2018/12/12 00:00:00'格式
    formatTimeM(Date) {
        let year = Date.getFullYear();
        let month = Date.getMonth() + 1 < 10 ? '0' + (Date.getMonth() + 1) : Date.getMonth() + 1;
        let date = Date.getDate() < 10 ? '0' + Date.getDate() : Date.getDate();
        let hour = Date.getHours() < 10 ? '0' + Date.getHours() : Date.getHours();
        let minute = Date.getMinutes() < 10 ? '0' + Date.getMinutes() : Date.getMinutes();
        let second = Date.getSeconds() < 10 ? '0' + Date.getSeconds() : Date.getSeconds();
        return year + '/' + month + '/' + date + ' ' + hour + ':' + minute + ':' + second;
    },
    formatTimeH(Date) {
        let hour = Date.getHours() < 10 ? '0' + Date.getHours() : Date.getHours();
        let minute = Date.getMinutes() < 10 ? '0' + Date.getMinutes() : Date.getMinutes();
        let second = Date.getSeconds() < 10 ? '0' + Date.getSeconds() : Date.getSeconds();
        return hour + ':' + minute + ':' + second;
    },
    formatTimeD(Date) {
        let year = Date.getFullYear();
        let month = Date.getMonth() + 1 < 10 ? '0' + (Date.getMonth() + 1) : Date.getMonth() + 1;
        let date = Date.getDate() < 10 ? '0' + Date.getDate() : Date.getDate();
        return year + '-' + month + '-' + date;
    },
    calcTimeDayLength(beginT, endT) {
        let stime = Date.parse(new Date(beginT));
        let etime = Date.parse(new Date(endT));
        let usedTime = etime - stime;  //两个时间戳相差的毫秒数
        let days = Math.floor(usedTime / (24 * 3600 * 1000));
        return days;
    },
    calcTimeLength(beginDate, endDate) {
        let timeLen = (endDate.getTime() - beginDate.getTime()) / 1000;
        let year = endDate.getFullYear();
        let month = endDate.getMonth() + 1 < 10 ? '0' + (endDate.getMonth() + 1) : endDate.getMonth() + 1;
        let date = endDate.getDate() < 10 ? '0' + endDate.getDate() : endDate.getDate();
        let temp = new Date(year + '/' + month + '/' + date + ' 00:00:00');
        temp.setSeconds(temp.getSeconds() + timeLen);
        let hour = temp.getHours() < 10 ? '0' + temp.getHours() : temp.getHours();
        let minute = temp.getMinutes() < 10 ? '0' + temp.getMinutes() : temp.getMinutes();
        let second = temp.getSeconds() < 10 ? '0' + temp.getSeconds() : temp.getSeconds();
        return hour + ':' + minute + ':' + second
    },
    firstExistDataIndex(datesIsContainData) {
        for (let i = 0; i < datesIsContainData.length; i++) {
            if (datesIsContainData[i]) {
                return i
            }
        }
        return -1;
    },
    IEVersion() {
        var userAgent = navigator.userAgent; //取得浏览器的userAgent字符串
        var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1; //判断是否IE<11浏览器
        var isEdge = userAgent.indexOf("Edge") > -1 && !isIE; //判断是否IE的Edge浏览器
        var isIE11 = userAgent.indexOf('Trident') > -1 && userAgent.indexOf("rv:11.0") > -1;
        var result = '';
        if (isIE) {
            var reIE = new RegExp("MSIE (\\d+\\.\\d+);");
            reIE.test(userAgent);
            var fIEVersion = parseFloat(RegExp["$1"]);
            if (fIEVersion == 7) {
                result = 'ie7';
            } else if (fIEVersion == 8) {
                result = 'ie8';
            } else if (fIEVersion == 9) {
                result = 'ie9';
            } else if (fIEVersion == 10) {
                result = 'ie10';
            } else {
                result = 'ie6';//IE版本<=7
            }
        } else if (isEdge) {
            result = 'edge';//edge
        } else if (isIE11) {
            result = 'ie11'; //IE11
        } else {
            result = '';//不是ie浏览器
        }
        return result;
    },
    resetVuexState(state, exceptArr = []) {
        let typeMap = {
            'Undefined': undefined,
            'Null': null,
            'Number': 0,
            'String': '',
            'Boolean': false,
            'Array': [],
            'Object': {},
        };
        Object.keys(state).forEach(key => {
            if (!exceptArr.includes(key)) {
                for (let type in typeMap) {
                    if (Object.prototype.toString.call(state[key]).includes(type)) {
                        state[key] = typeMap[type];
                        break;
                    }
                }
            }
        })
    },
    rhythmTranslateMap: {
        NORMAL: "窦性",
        BRD: "窦缓",
        TAC: "窦速",
        ARR: "窦不齐",
        V: "单个室早",
        VC: "成对室早",
        CV: "多发室早",
        BGM: "室性二联律",
        TGM: "室性三联律",
        VR: "室性节律",
        VF: "室颤",
        VTAC: "室速",
        VBRD: "室缓",
        S: "单个房早",
        SC: "成对房早",
        CS: "多发房早",
        SBGM: "房性二联律",
        STGM: "房性三联律",
        STAC: "室上速",
        SBRD: "室上缓",
        SVR: "室上性节律",
        AF: "房颤",
        AFLUT: "房扑",
        LRR: "长RR间歇",
        MAXHR: "最快心率",
        MINHR: "最慢心率",
        NOISE: "噪音",
        CUSTOM: "自定义留图"
    },
    calcShortCuts(days, date = null) {
        let now = date ? new Date(date) : new Date()
        let end = new Date(now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' 23:59:00');
        now.setTime(now.getTime() - 3600 * 1000 * 24 * days);
        let start = new Date(now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' 00:00:00');
        return [start, end];
    },
    globalState: {
        INITIAL: '未上传',// 报告初始状态（未上传状态）
        UPLOAD_FAILED: '上传失败',// 报告上传失败
        WAIT_FOR_ANALYZE: '待分析',// 上传成功，等待分析
        ANALYZING: '分析中',// 正在分析中
        ANALYZE_FAILED: '分析失败',// 分析失败
        WAIT_FOR_EDIT: '分析完',// 分析完成，等待医生标注
        EDITING: '标注中', // 医生正在标注中
        AUDITING: '审核中',// 标注完成，等待审核医生审核
        AUDIT_PASS: '已审核', // 审核通过
        FINISH: '已完成'// 数据管理员已经下载报告，报告进入不可修改状态
    },
    globalStateColorMap: {
        INITIAL: '#6f6f6f',// 报告初始状态（未上传状态）
        UPLOAD_FAILED: '#fe010f',// 报告上传失败
        WAIT_FOR_ANALYZE: '#409EFF',// 上传成功，等待分析
        ANALYZING: '#FFC000',// 正在分析中
        ANALYZE_FAILED: '#fe010f',// 分析失败
        WAIT_FOR_EDIT: '#12d726',// 分析完成，等待医生标注
        EDITING: '#FFC000', // 医生正在标注中
        AUDITING: '#FFC000',// 标注完成，等待审核医生审核
        AUDIT_PASS: '#12d726', // 审核通过
        FINISH: '#12d726'// 数据管理员已经下载报告，报告进入不可修改状态
    },
    userType: {
        ROLE_EDITOR: 0,
        ROLE_UPLOADER: 1,
        ROLE_ADMINISTRATOR: 2,
        ROLE_AUDITOR: 3,
        ROLE_SUPER_ADMINISTRATOR: 4
    },
    calcRRIScatterData(tags, ecgStartTime) {
        function beatIncludedRhythm(index, rhythms) {
            let flag = false;
            for (let k = 0; k < rhythms.length; k++) {
                if (index >= rhythms[k].begin && index < rhythms[k].end) {
                    flag = true;
                    break;
                }
            }
            return flag;
        }

        let result = [];
        let rhythms = tags.rhythm;
        let beats = tags.tagPos;
        let noises = rhythms.filter(e => {
            return e.type === 'NOISE'
        });
        let afRhythms = rhythms.filter(e => {
            return e.type === 'AF' && e.state !== 0
        });
        let aflutRhythms = rhythms.filter(e => {
            return e.type === 'AFLUT' && e.state !== 0
        });
        let scatterColor = '';
        let fillColorMap = {
            N: this.nTag,
            V: this.vTag,
            S: this.sTag,
            AF: this.afRythmColor,
            AFLUT: this.aflutRythmColor
        };
        let preTagP = 0;
        let draw_cycle = true;
        for (let i = 0; i < beats.length; i++) {
            if (beats[i].state !== 0 && beats[i].t === 'Q') {
                preTagP = 0;
                continue;
            }
            if (preTagP !== 0) {
                if (beats[i].state !== 0) {
                    draw_cycle = true;
                    let rri = (beats[i].p - preTagP) / 512;
                    for (let j = 0; j < noises.length; j++) {
                        let rhyLen = noises[j].end - noises[j].begin;
                        if (rhyLen + (beats[i].p - preTagP) >= Math.max(beats[i].p, noises[j].end) - Math.min(preTagP, noises[j].begin)) {
                            draw_cycle = false;
                            break;
                        }
                    }
                    if (rri < 60 && rri > 0 && draw_cycle) {
                        scatterColor = fillColorMap[beats[i].t] || '#666';
                        if (beatIncludedRhythm(beats[i].p, afRhythms)) {
                            scatterColor = fillColorMap.AF;
                        }
                        if (beatIncludedRhythm(beats[i].p, aflutRhythms)) {
                            scatterColor = fillColorMap.AFLUT;
                        }
                        let y = parseInt(rri * 1000);
                        let x = new Date(ecgStartTime).setSeconds(new Date(ecgStartTime).getSeconds() + beats[i].p / 512);
                        if (y > 3000) {
                            y = 3000;
                        }
                        result.push([x, y]);
                    }
                }
            }
            if (beats[i].state !== 0) {
                preTagP = beats[i].p
            }
        }
        return result;
    },
    //获取鼠标点击位置附近的心拍,用于fastBeat接口的心拍数据查找
    findNearestBeat(mouseClickPos, currentPageTags) {
        if(currentPageTags.length===0){
            return null;
        }
        let minApart = Math.abs(currentPageTags[0].p - mouseClickPos);//记录离点击位置最近的距离，方便找出对应的tag
        let minApartTag = currentPageTags[0];
        for (let i = 1; i < currentPageTags.length; i++) {
            let apart = Math.abs(currentPageTags[i].p - mouseClickPos);
            if (apart < minApart &&currentPageTags[i].t!=='O') {
                minApart = apart;
                minApartTag = currentPageTags[i];
            }
        }
        return minApartTag;
    },
    //二分查找法
    findCurrentIndex(isTag, data, timeOffsetPoints) {
        let l = 0, r = data.length - 1;
        while (l <= r) {
            let mid = Math.floor((l + r) / 2);
            let currentP = isTag ? data[mid].p : data[mid].begin;
            if (currentP < timeOffsetPoints) {
                l = mid + 1;
            } else if (currentP > timeOffsetPoints) {
                r = mid - 1;
            } else {
                return {state:true,index:mid};
            }
        }
        return {state:false,index:l};
    },
}
