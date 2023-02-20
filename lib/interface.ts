// 通用对象类型
interface ObjectKey {
    [key: string]: any;
}

// 过渡动画对象类型
interface Transition {
    vsSource: string,
    fsSource: string,
    assignmentList: any[],
    intervalTime?: number,
}

// index.ts中动态导入的过渡动画返回Promise所需类型
interface TransitionObj {
    [key: string]: Transition;
}

/**
 * index.ts interface
 */
// 需要赋值给自定义uniform的参数
interface AssignmentList {
    key: string,
    value: number[],
}

interface ParentDom {
    domId: string,
    width?: string | number | undefined,
    height?: string | number | undefined,
}

export type { ObjectKey, Transition, TransitionObj, AssignmentList, ParentDom }