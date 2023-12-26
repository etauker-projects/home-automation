export const mapLineToJson = (headers: string[], line: string) => {
    const object = headers.reduce((obj, header, index) => {
        const value = line.split(',')[index];
        if (value) {
            // console.log(`${header}=${value}`);
            obj[header] = value;
        }
        return obj;
    }, {} as any);
    return object;
}

export const mapLinesToJsonArray = (headers: string[], lines: string[]) => {
    return lines.map(line => mapLineToJson(headers, line));
}
