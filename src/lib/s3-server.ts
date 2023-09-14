import AWS from 'aws-sdk';
import fs from 'fs';
import os from 'os'; // Import the os module

export async function downloadFromS3(file_key: string) {
    try {
        AWS.config.update({
            accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
        });

        const s3 = new AWS.S3({
            params: {
                Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
            },
            region: "ca-central-1",
        });

        const params = {
            Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
            Key: file_key,
        };

        const obj = await s3.getObject(params).promise();

        // Use os.tmpdir() to get the system's temporary directory
        const file_name = `${os.tmpdir()}/pdf-${Date.now()}.pdf`;
        fs.writeFileSync(file_name, obj.Body as Buffer);
        return file_name;

    } catch (error) {
        console.error("Error in downloadFromS3:", error);
        throw error; // Propagate the error to be handled by the calling function
    }
}
