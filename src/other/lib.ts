export class Lib {
    private greeting: string;

    constructor(greeting: string) {
        this.greeting = greeting;
    }

    getGreeting(): string {
        return this.greeting;
    }
}