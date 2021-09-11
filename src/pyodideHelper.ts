
import { D4C } from "d4c-queue";

const jpeg = require("jpeg-lossless-decoder-js");
// const decoder = new jpeg.lossless.Decoder();

declare var loadPyodide: any;
declare var pyodide: any;

const test: number[] = []

function add(x: number) {
    test.push(x);
}

class Polygon {
    height: number;
    width: number;
    constructor() {
        this.height = 100;
        this.width = 100;
    }

    addWidth() {
        this.width += 100;
    }
}
const polygon = new Polygon()

const my_js_module: any = {
    // decoder: decoder,
    add,
    polygon,
    jpeg,
    newDecoder: function () {
        return new jpeg.lossless.Decoder();
    }
};


export const d4c = new D4C();
export const initPyodide = d4c.wrap(async () => {
    await loadPyodide({ indexURL: "pyodide/" });
    await pyodide.loadPackage(['numpy', 'micropip']);
    const pythonCode = await (await fetch('python/pyodide_init.py')).text();
    await pyodide.runPythonAsync(pythonCode);
    pyodide.registerJsModule("my_js_module", my_js_module);
});

export const loadPyodideDicomModule = d4c.wrap(async () => {
    const pythonCode = await (await fetch('python/dicom_parser.py')).text();
    await pyodide.runPythonAsync(pythonCode);
    const PyodideDicom = pyodide.globals.get('PyodideDicom')
    return PyodideDicom
});

// ****** deprecated ******/
/** without d4c-queue, parseByPython will throw exception 
 * if it is called before initPyodide is finished */
export const parseByPython = d4c.wrap(async (buffer: ArrayBuffer) => {
    my_js_module["buffer"] = buffer;
    // this decoder shoulbe be re-newed everytime, 
    // otherwise 2nd decoding will use some internal temporary variables from 1st time and issues happen
    //my_js_module["decoder"] = new jpeg.lossless.Decoder();
    const pythonCode = await (await fetch('python/dicom_parser.py')).text();
    const res = await pyodide.runPythonAsync(pythonCode);

    // works !!    
    const x1 = pyodide.globals.get('x')
    console.log(`x1:${x1}`)
    const Test = pyodide.globals.get('Test')
    // works !!! can invoke Python constructor 
    const k2 = Test()
    console.log(`k2:${k2.a}`)


    // works !!! to access python global object instance
    const bb = pyodide.globals.get('bb')
    console.log(`bb:${bb.a}`)
    bb.test_a() // works !!!

    console.log("after run python:", test) // yes !!!!
    console.log("after run python:", polygon) // yes !!!!
    const data = res.toJs(1);
    console.log("data:", data);
    console.log(`type:${typeof data}`)
    const width = data[1];
    const height = data[2];
    const photometric = data[5]
    const transferSyntaxUID = data[6]
    const allocated_bits = data[7]
    if (data[3] === undefined) {
        // python bytes -> uinit8 array 
        const data2 = data[0].getBuffer()

        //1048576
        // 718940
        console.log("it is compressed data:", data2.data)
        // return { data: 1, width: 2, height: 3 }
        return { compressedData: data2.data, width, height, photometric, transferSyntaxUID, allocated_bits }
    }

    const pyBufferData = data[0].getBuffer("u8clamped");

    res.destroy();
    /** TODO: need releasing buffer data? pyBufferData.release()
     * ref: https://pyodide.org/en/stable/usage/type-conversions.html#converting-python-buffer-objects-to-javascript */
    return { data: pyBufferData.data, width, height, photometric, transferSyntaxUID };
});
