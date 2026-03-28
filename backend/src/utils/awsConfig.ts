export const AWS_REGION = process.env.AWS_REGION ?? 'ap-south-1';

export const isAwsMode = () => process.env.DATA_SOURCE === 'aws';
