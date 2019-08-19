import { ImageSource } from "tns-core-modules/image-source";
import { MLKitVisionOptions, } from "../";
import { MLKitObjectDetectionOptions, MLKitObjectDetectionResult, MLKitObjectDetectionResultItem } from "./";
import { MLKitObjectDetection as MLKitObjectDetectionBase, ObjectDetectionCategory } from "./objectdetection-common";

declare const com: any;

export class MLKitObjectDetection extends MLKitObjectDetectionBase {

  protected createDetector(): any {
    return getDetector(true, this.classify, this.multiple);
  }

  protected createSuccessListener(): any {
    return new com.google.android.gms.tasks.OnSuccessListener({
      onSuccess: objects => {
        console.log(">> onSuccess @ " + new Date().getTime() + ", objects: " + objects);

        if (objects.size() === 0) return;

        const result = <MLKitObjectDetectionResult>{
          objects: []
        };

        // see https://github.com/firebase/quickstart-android/blob/0f4c86877fc5f771cac95797dffa8bd026dd9dc7/mlkit/app/src/main/java/com/google/firebase/samples/apps/mlkit/textrecognition/TextRecognitionProcessor.java#L62
        for (let i = 0; i < objects.size(); i++) {
          result.objects.push(getMLKitObjectDetectionResultItem(objects.get(i)));
        }

        this.notify({
          eventName: MLKitObjectDetection.scanResultEvent,
          object: this,
          value: result
        });
      }
    });
  }
}

function getDetector(stream: boolean, classify: boolean, multiple: boolean): com.google.firebase.ml.vision.objects.FirebaseVisionObjectDetector {
  const builder = new com.google.firebase.ml.vision.objects.FirebaseVisionObjectDetectorOptions.Builder()
      .setDetectorMode(stream ? com.google.firebase.ml.vision.objects.FirebaseVisionObjectDetectorOptions.STREAM_MODE : com.google.firebase.ml.vision.objects.FirebaseVisionObjectDetectorOptions.SINGLE_IMAGE_MODE);

  if (classify) {
    builder.enableClassification();
  }

  if (multiple) {
    builder.enableMultipleObjects();
  }

  return com.google.firebase.ml.vision.FirebaseVision.getInstance().getOnDeviceObjectDetector(builder.build());
}

export function detectObjects(options: MLKitObjectDetectionOptions): Promise<MLKitObjectDetectionResult> {
  return new Promise((resolve, reject) => {
    try {
      const firebaseObjectDetector = getDetector(false, options.classify, options.multiple);

      const onSuccessListener = new com.google.android.gms.tasks.OnSuccessListener({
        onSuccess: objects => {
          const result = <MLKitObjectDetectionResult>{
            objects: []
          };

          if (objects) {
            for (let i = 0; i < objects.size(); i++) {
              result.objects.push(getMLKitObjectDetectionResultItem(objects.get(i)));
            }
          }

          resolve(result);
          firebaseObjectDetector.close();
        }
      });

      const onFailureListener = new com.google.android.gms.tasks.OnFailureListener({
        onFailure: exception => reject(exception.getMessage())
      });

      firebaseObjectDetector
          .processImage(getImage(options))
          .addOnSuccessListener(onSuccessListener)
          .addOnFailureListener(onFailureListener);

    } catch (ex) {
      console.log("Error in firebase.mlkit.labelImageOnDevice: " + ex);
      reject(ex);
    }
  });
}

function getMLKitObjectDetectionResultItem(obj: com.google.firebase.ml.vision.objects.FirebaseVisionObject): MLKitObjectDetectionResultItem {
  return {
    id: obj.getTrackingId() ? obj.getTrackingId().intValue() : undefined,
    confidence: obj.getClassificationConfidence() ? obj.getClassificationConfidence().doubleValue() : undefined,
    category: ObjectDetectionCategory[obj.getClassificationCategory()],
    // TODO
    image: undefined,
    bounds: undefined
  };
}

function getImage(options: MLKitVisionOptions): any /* com.google.firebase.ml.vision.common.FirebaseVisionImage */ {
  const image: android.graphics.Bitmap = options.image instanceof ImageSource ? options.image.android : options.image.imageSource.android;
  return com.google.firebase.ml.vision.common.FirebaseVisionImage.fromBitmap(image);
}