import winston, { format } from 'winston';

const {
  combine, prettyPrint, errors,
} = format;

export default winston.createLogger({
  format: combine(
    errors({ stack: true }),
    prettyPrint(),
  ),
  level: 'info',
  transports: [
    new winston.transports.Console(),
  ],
});
