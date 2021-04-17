import pydicom
from pydicom.pixel_data_handlers.util import apply_modality_lut
from my_js_module import buffer
import numpy as np
import time

print("get buffer from javascript, copied memory to wasm heap, start to read dicom")
# print(buffer) #  memoryview object.
# file_name = "image-00000-ot.dcm"
ds = pydicom.dcmread(io.BytesIO(buffer), force=True)  # file_name
print("read dicom ok")
# name = ds.PatientName
# print("family name:"+name.family_name)
arr = ds.pixel_array

print("read dicom pixel_array ok")

image2d = apply_modality_lut(arr, ds)
print("start to get max/min")

start = time.time()
min = image2d.min()
end = time.time()
# 0.0009999275207519531 / 0.0002989768981933594 (pyodide : local python)
print(f"1. min time :{end-start}")
start = time.time()
max = image2d.max()
end = time.time()
print(f"2. max time :{end-start}")  # 0.0 / 0.00027108192443847656
print(f'pixel (after lut) min:{min}')
print(f'pixel (after lut) max:{max}')  # 255
width = len(image2d[0])
height = len(image2d)
print(f'width:{width};height:{height}')

print("start to flatten 2d grey array to RGBA 1d array + normalization")
# step1: normalize
start = time.time()
print(f"center pixel:{image2d[width//2][height//2]}")
# step1: normalize
# ref: https://towardsdatascience.com/normalization-techniques-in-python-using-numpy-b998aa81d754
# or use sklearn.preprocessing.minmax_scale, https://stackoverflow.com/a/55526862
# scale = np.frompyfunc(lambda x, min, max: (x - min) / (max - min), 3, 1)
value_range = max - min
# 0.003, if no astype, just 0.002. using // become 0.02
# or using colormap is another fast way,
image2d = (((image2d-min)/value_range)*255).astype("uint8")
print(f"normalize time:{time.time()-start}")
print(f"after normalize, center pixel:{image2d[width//2][height//2]}")
# https://stackoverflow.com/questions/63783198/how-to-convert-2d-array-into-rgb-image-in-python
# step2: 2D grey -> 2D RGBA -> Flattn to 1D RGBA
start = time.time()
alpha = np.full((width, height), 255)  # ~
stacked = np.dstack((image2d, image2d, image2d, alpha))
print(f"stacked shape:{stacked.shape}")  # 512x 512x 4
image = stacked.flatten()
print(f"final shape:{image.shape}, type:{image.dtype}")  # int32
image = image.astype("uint8")
print(f"flatten time:{time.time()-start}")  # 0.002s

# 2d -> 1d -> 1d *4 (each array value -copy-> R+G+B+A)
# NOTE: 1st memory copy/allocation
# image = np.zeros(4*width*height, dtype="uint8")
# print("allocated a 1d array, start to flatten 2d grey array to RGBA 1d array + normalization")
# # ISSUE: Below may takes 3~4s for a 512x512 image, Using JS is much faster: <0.5s !!
# # Also, the wired thing is image2d.min()/max() is fast. Need more study/measurement.
# delta1 = 0
# delta2 = 0
# delta3 = 0
# delta4 = 0
# delta5 = 0
# delta6 = 0
# delta7 = 0
# # local python: 0.65s
# # pyodide: 7.266s
# for i_row in range(0, height):
#     for j_col in range(0, width):
#         start = time.time()
#         # 0.8350014686584473 / 0.06848788261413574
#         store_value = image2d[i_row][j_col]
#         # end = time.time()
#         delta1 += time.time() - start
#         start = time.time()
#         # 4.2840001583099365 / 0.32952332496643066
#         # Issue:  (store_value - min) * 255 / value_range
#         # 1. slow
#         # 2. final image seems wrong
#         value = store_value  #
#         # value = store_value
#         delta2 += time.time() - start
#         start = time.time()
#         # 0.41300106048583984 / 0.04794716835021973
#         k = 4 * (i_row*width + j_col)
#         delta3 += time.time() - start
#         start = time.time()
#         image[k] = value  # 0.4740023612976074 / 0.05642890930175781
#         delta4 += time.time() - start
#         start = time.time()
#         image[k + 1] = value  # 0.44700074195861816 / 0.05257463455200195
#         delta5 += time.time() - start
#         start = time.time()
#         image[k + 2] = value  # 0.42699670791625977 / 0.048801422119140625
#         delta6 += time.time() - start
#         start = time.time()
#         image[k + 3] = 255  # 0.3860006332397461 / 0.04797720909118652
#         delta7 += time.time() - start
# total = delta1 + delta2 + delta3 + delta4 + delta5 + delta6 + delta7
# print(f"2d grey array flattens to 1d RGBA array + normalization ok:{total}")
# print(f"{delta1}, {delta2}, {delta3}, {delta4}, {delta5}, {delta6}, {delta7}")

# Issue: instead of v0.17.0a2, if using latest dev code, this numpy.uint16 value becomes empty in JS !!!
# so we need to use int(min), int(max)
print(f'min type is:{type(min)}')  # numpy.uint16
print(f'max type is:{type(width)}')

if __name__ == '__main__':
    # will not be executed
    print("it is main, for testing")

image, int(min), int(max), width, height
