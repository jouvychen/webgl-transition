const isArrayOfStrings = (value: unknown): value is string[] => {
    return Array.isArray(value) && value.every(item => typeof item === "string");
}

// 防抖函数
const debounce = (fn: any, delay: number) => {
    let timer: any = null;
    return function () {
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line prefer-rest-params
            fn.apply(this, arguments);
            timer = null;
        }, delay);
    };
};

// 节流函数
const throttle = (fn: any, delay: number) => {
    let timer: any = null;
    let status = false;
    return function () {
        if (timer) { return; }
        if (!status) {
            status = true;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line prefer-rest-params
            fn.apply(this, arguments);
        }
        timer = setTimeout(() => {
            if (status) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                // eslint-disable-next-line prefer-rest-params
                fn.apply(this, arguments);
                timer = null;
            }
        }, delay);
    };
};

export { isArrayOfStrings, debounce, throttle }