import { isNumber } from '@nestjs/common/utils/shared.utils';

export const ConsumeTopics = new Map();
export const ConsumeObjects = new Map();
export const ConsumeOffsets = new Map();

export const MessageListeners = (topic: string, offsetReset?: 'latest' | 'earliest' | number) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = target[propertyKey];

    ConsumeTopics.set(topic, originalMethod);

    if (offsetReset) {
      if (isNumber(offsetReset) && offsetReset >= 0) {
        ConsumeOffsets.set(topic, offsetReset);
      }

      if (offsetReset === 'latest' || offsetReset === 'earliest') {
        ConsumeOffsets.set(topic, offsetReset);
      }
    }

    return descriptor;
  };
};

export const BindContext = (topic: string, context: any) => {
  ConsumeObjects.set(topic, context);
};
