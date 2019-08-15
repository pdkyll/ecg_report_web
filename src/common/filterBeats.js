/*
 * beats: 心拍数组, 每一个元素具备如下三个字段
 *    1. at: 位置
 *    2. type: 节拍类型
 *    3. clusterId: 模板聚类id
 *
 * filterNames: 字符串数组, 每一个元素
 *   按照逗号分割后的, 每一个片段必须符合正则表达式: R(-(N|V|S|Q)(\d)*)?|(N|V|S|Q)(\d)*
 *    例如
*     1, R-S,S
*     2. R-V13,V13
 *    1. R,R-S,S
 *    2. R,R-V13,V13
 *
 * @return 一个json map:
 *      key为filterNames中每一个元素,
 *      value: beat集合
 */
function filterBeats(beats, filterNames, exceptQ = false) {
    const partRegExp = /R(\-(N|V|S|Q)(\d)*)?|(N|V|S|Q)(\d)*/;
    const filterArr = [];
    for (let filterName of filterNames) {
        let conditions = [];
        for (let part of filterName.split(",")) {
            if (!partRegExp.test(part)) {
                throw new Error('Illegal filter part "' + part + '" of "' + beatFilter + '"');
            }
            conditions.push(parseCondition(part));
        }
        let filter = filterMapCache[filterName];
        if (filter === undefined) {
            filterMapCache[filterName] = filter = generateFilter(conditions);
        }
        filterArr.push(filter);
    }
    let js = '(function() {\n';
    js += '\treturn function(beats, filterHandlers) {\n';
    for (let filterIndex = 0; filterIndex < filterNames.length; filterIndex++) {
        js += '\t\tlet beats' + filterIndex + ' = [];\n';
        js += '\t\tlet beatIndex' + filterIndex + ' = -1;\n';
    }
    js += '\t\tlet len = beats.length;\n';
    js += '\t\tfor (let i = 0; i < len; i++) {\n';
    for (let filterIndex = 0; filterIndex < filterNames.length; filterIndex++) {
        js += '\t\t\tif (filterHandlers[' + filterIndex + '](beats, i)) {\n';
        js += '\t\t\t\tlet index = i - '+ filterArr[filterIndex].beatCount + ';\n';
        js += '\t\t\t\tif (beatIndex' + filterIndex + ' < index) {\n';
        js += '\t\t\t\t\tbeatIndex' + filterIndex + ' = index;\n';
        js += '\t\t\t\t}\n';
        js += '\t\t\t\twhile (beatIndex' + filterIndex + ' < i) {\n';
        js += '\t\t\t\tlet index = ++beatIndex' + filterIndex + ';\n';
        js += '\t\t\t\tlet obj = Object.assign({}, beats[index]);\n';
        js += '\t\t\t\tif (beats[index] === undefined) continue;\n';
        js += '\t\t\t\tif (beats[index].t === "O") continue; \n';
        js += '\t\t\t\tif (exceptQ){\n';
        js += '\t\t\t\t\tif (beats[index].t === "Q") continue; \n';
        js += '\t\t\t\t};\n';
        js += '\t\t\t\t\tif (beats[index - 1]){\n';
        js += '\t\t\t\t\t\tobj.x = Math.floor((beats[index].p - beats[index - 1].p) / 512 * 1000);\n';
        js += '\t\t\t\t\t\t}else {\n';
        js += '\t\t\t\t\t\tobj.x = 3000;';
        js += '\t\t\t\t\t}\n';
        js += '\t\t\t\t\tif (beats[index + 1]){\n';
        js += '\t\t\t\t\t\tobj.y = Math.floor((beats[index + 1].p - beats[index].p) / 512 * 1000);\n';
        js += '\t\t\t\t\t}else {\n';
        js += '\t\t\t\t\t\tobj.y = 3000;';
        js += '\t\t\t\t\t}\n';
        js += '\t\t\t\t\tlet degreeIndex=Math.floor(obj.x / 25); \n';
        js += '\t\t\t\t\tif (beats' + filterIndex + '[degreeIndex]){\n';
        js += '\t\t\t\t\tbeats' + filterIndex + '[degreeIndex].push(obj);\n';
        js += '\t\t\t\t\t}else {\n';
        js += '\t\t\t\t\tbeats' + filterIndex + '[degreeIndex] = [obj];\n';
        js += '\t\t\t\t\t}\n';
        js += '\t\t\t\t}\n';
        js += '\t\t\t}\n';
    }
    js += '\t\t}\n';
    js += "\t\treturn {\n";
    for (let filterIndex = 0; filterIndex < filterNames.length; filterIndex++) {
        js += '\t\t\t"' + filterNames[filterIndex] + '": beats' + filterIndex + ',\n';
    }
    js += "\t\t};\n";
    js += '\t};\n';
    js += '})();\n';
    return eval(js)(beats, filterArr.map(filter => filter.handler));
}

/*
 * @return null或Condition对象, 该对象具备三个字段
 * 1. negative: boolean类型, 该条件什反方向还是正向
 */
function parseCondition(part) {
    const charCodeR = 'R'.charCodeAt(0);
    const charCodeMinus = '-'.charCodeAt(0);
    const charCodeZero = '0'.charCodeAt(0);
    const charCodeNine = '9'.charCodeAt(0);
    const len = part.length;
    let conditions = [];
    let condition = undefined;
    let typeIndex = 0;
    if (part.charCodeAt(0) === charCodeR) {
        if (len > 1 && part.charCodeAt(1) === charCodeMinus) {
            condition = { negative: true };
            typeIndex = 2;
        }
    } else {
        condition = { negative: false };
    }
    if (condition) {
        condition.type = part.charAt(typeIndex);
        if (len > typeIndex + 1) {
            let clusterId = 0;
            for (let clusterIndex = typeIndex + 1; clusterIndex < len; clusterIndex++) {
                let c = part.charCodeAt(clusterIndex);
                if (c >= charCodeZero && c <= charCodeNine) {
                    clusterId = clusterId * 10 + c - charCodeZero;
                }
            }
            condition.clusterId = clusterId;
        }
    }
    return condition;
}

function generateFilter(conditions) {

    let js = '(function() {\n';
    js += '\treturn function(beats, index) {\n';

    js += '\t\tif (index < ' + (conditions.length - 1) + ') {\n';
    js += '\t\t\treturn false;\n';
    js += '\t\t}\n';

    for (let i = conditions.length - 1; i >= 0; --i) {
        if (conditions[i] != undefined) {
            let beatExp = i === conditions.length - 1 ? 'beats[index]' : 'beats[index - ' + (conditions.length - 1 - i) + ']';
            let negative = conditions[i].negative;
            js += '\t\tif (' + beatExp + '.' + TYPE_FIELD;
            js += negative ? ' == ' : ' != ';
            js += '\'';
            js += conditions[i].type;
            js += '\'';
            if (conditions[i].clusterId !== undefined) {
                js += negative ? ' && ' : ' || ';
                js += beatExp + '.' + CLUSTER_ID_FIELD;
                js += negative ? ' == ' : ' != ';
                js += conditions[i].clusterId;
            }
            js += ') {\n';
            js += '\t\t\treturn false;\n'
            js += '\t\t}\n';
        }
    }
    js += '\t\treturn true;\n';
    js += '\t};\n';
    js += '})();';
    return {
        beatCount: conditions.length,
        handler: eval(js)
    };
}

let filterMapCache = {};
const TYPE_FIELD = "t";
const CLUSTER_ID_FIELD = "m";
export default {
    filterBeats: filterBeats
}