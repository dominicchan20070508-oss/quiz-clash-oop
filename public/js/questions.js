// questions.js — OOP quiz bank (English, 73 rigorous questions based on COS20007 lectures).
// UMD: browser global QUESTIONS; Node require. Server shuffles options per question.
(function (root, factory) {
  const list = factory();
  if (typeof module === 'object' && module.exports) module.exports = list;
  else root.QUESTIONS = list;
})(typeof self !== 'undefined' ? self : this, function () {
  return [
    // ============ Topic 1: Introducing Objects ============
    { id: 't1-01', category: 'Introducing Objects', q: 'In object-oriented programming, an object bundles together which two things?', options: ['Data (attributes) and behavior (methods)', 'Only data and constants', 'Only functions and pointers', 'Hardware and software'], answer: 0 },
    { id: 't1-02', category: 'Introducing Objects', q: 'What is the term for a value or characteristic stored by an object?', options: ['Attribute (field)', 'Method', 'Constructor', 'Namespace'], answer: 0 },
    { id: 't1-03', category: 'Introducing Objects', q: 'What is the term for an action that an object is able to perform?', options: ['Behavior (method)', 'Attribute', 'Property only', 'Class'], answer: 0 },
    { id: 't1-04', category: 'Introducing Objects', q: 'A class is best described as which of the following?', options: ['A template or blueprint for creating objects', 'A single running object', 'A type of loop', 'A memory address'], answer: 0 },
    { id: 't1-05', category: 'Introducing Objects', q: 'Hiding an object internal data and exposing only a controlled interface is called:', options: ['Encapsulation', 'Compilation', 'Iteration', 'Multiplicity'], answer: 0 },
    { id: 't1-06', category: 'Introducing Objects', q: 'Abstraction is the process of:', options: ['Identifying essential features while ignoring irrelevant detail', 'Copying an object to the stack', 'Running every unit test', 'Declaring all members public'], answer: 0 },
    { id: 't1-07', category: 'Introducing Objects', q: 'Which access modifier limits a member to inside its own class?', options: ['private', 'public', 'protected', 'global'], answer: 0 },
    { id: 't1-08', category: 'Introducing Objects', q: 'Which access modifier allows a member to be accessed from anywhere?', options: ['public', 'private', 'protected', 'internal-only'], answer: 0 },
    { id: 't1-09', category: 'Introducing Objects', q: 'Which access modifier allows access in the class and in classes derived from it?', options: ['protected', 'private', 'anonymous', 'static'], answer: 0 },
    { id: 't1-10', category: 'Introducing Objects', q: 'A get accessor of a property is used to:', options: ['Return or retrieve a value', 'Assign a new value', 'Create a class', 'Delete an object'], answer: 0 },
    { id: 't1-11', category: 'Introducing Objects', q: 'A set accessor is used to assign a value; in C# the implicit parameter inside it is named:', options: ['value', 'result', 'input', 'target'], answer: 0 },
    { id: 't1-12', category: 'Introducing Objects', q: 'Which statement about a constructor is correct?', options: ['It has the same name as the class and no return type', 'It must return an integer', 'It runs only when the program closes', 'It is always declared private'], answer: 0 },
    { id: 't1-13', category: 'Introducing Objects', q: 'Which keyword creates and initializes a new object instance?', options: ['new', 'this', 'base', 'get'], answer: 0 },
    { id: 't1-14', category: 'Introducing Objects', q: 'Fields that must not be accessed directly from outside the class are usually declared:', options: ['private', 'public', 'shared', 'open'], answer: 0 },
    { id: 't1-15', category: 'Introducing Objects', q: 'Compared with procedural code, grouping data and related methods in objects mainly helps to:', options: ['Manage complexity and improve reuse', 'slow the computer down', 'remove the need for testing', 'avoid using any classes'], answer: 0 },

    // ============ Topic 2: Unit Testing & TDD ============
    { id: 't2-01', category: 'TDD & Unit Testing', q: 'In unit testing, a "unit" refers to:', options: ['The smallest testable part of a program', 'The whole application', 'Only the user interface', 'A hardware component'], answer: 0 },
    { id: 't2-02', category: 'TDD & Unit Testing', q: 'In NUnit, the attribute that marks a class as containing tests is:', options: ['[TestFixture]', '[TestMethod]', '[Fact]', '[Setup]'], answer: 0 },
    { id: 't2-03', category: 'TDD & Unit Testing', q: 'In NUnit, an individual test method is marked with:', options: ['[Test]', '[TestClass]', '[Theory]', '[Mock]'], answer: 0 },
    { id: 't2-04', category: 'TDD & Unit Testing', q: 'Which NUnit assertion checks that an actual value equals an expected value?', options: ['Assert.AreEqual', 'Assert.IsNull only', 'Console.WriteLine', 'Assert.Throws never'], answer: 0 },
    { id: 't2-05', category: 'TDD & Unit Testing', q: 'The core TDD cycle is best ordered as:', options: ['Write a failing test, then make it pass, then refactor', 'Implement everything, then delete tests', 'Refactor first, never test', 'Test only after release'], answer: 0 },
    { id: 't2-06', category: 'TDD & Unit Testing', q: 'In test-driven development, tests are written:', options: ['Before the implementation', 'Only after the program ships', 'Instead of designing', 'By the compiler automatically'], answer: 0 },
    { id: 't2-07', category: 'TDD & Unit Testing', q: 'An assertion is a statement that:', options: ['Must evaluate to true or the test fails', 'Always prints output', 'Allocates heap memory', 'Replaces the constructor'], answer: 0 },
    { id: 't2-08', category: 'TDD & Unit Testing', q: 'The NUnit framework is designed for unit testing in which ecosystem?', options: ['.NET languages such as C#', 'Only hardware drivers', 'Only assembly code', 'Only databases'], answer: 0 },
    { id: 't2-09', category: 'TDD & Unit Testing', q: 'JUnit is the unit-testing framework associated with which language?', options: ['Java', 'C#', 'C++', 'SQL'], answer: 0 },
    { id: 't2-10', category: 'TDD & Unit Testing', q: 'Improving the internal structure of passing code without changing its behavior is called:', options: ['Refactoring', 'Overclocking', 'Encapsulating', 'Aggregating'], answer: 0 },
    { id: 't2-11', category: 'TDD & Unit Testing', q: 'Which NUnit assertion verifies that a Boolean condition is true?', options: ['Assert.IsTrue', 'Assert.AreEqualIgnoringCase only', 'CollectionAssert.Delete', 'Assert.Return'], answer: 0 },
    { id: 't2-12', category: 'TDD & Unit Testing', q: 'Which NUnit helper class is specifically used to assert about arrays and collections?', options: ['CollectionAssert', 'MathAssert', 'PointerAssert', 'HeapAssert'], answer: 0 },
    { id: 't2-13', category: 'TDD & Unit Testing', q: 'A single unit test is commonly organized into which three phases?', options: ['Set up, perform the operation, check the result', 'Compile, link, deploy', 'Open, save, close', 'Input, output, shutdown'], answer: 0 },

    // ============ Topic 3: Collaboration, memory, relationships, collections ============
    { id: 't3-01', category: 'Collaboration', q: 'Objects created while the program is running are stored in which memory segment?', options: ['The heap', 'The text segment', 'A register only', 'The code segment'], answer: 0 },
    { id: 't3-02', category: 'Collaboration', q: 'Method call frames and local variables are managed in which segment?', options: ['The stack (LIFO)', 'The heap', 'The text segment', 'The graphics buffer'], answer: 0 },
    { id: 't3-03', category: 'Collaboration', q: 'The compiled machine code of a program resides in the:', options: ['Text (code) segment', 'Stack segment', 'Heap segment', 'Indexer segment'], answer: 0 },
    { id: 't3-04', category: 'Collaboration', q: 'In Java and C#, running objects are normally reached through:', options: ['References', 'Direct raw pointers only', 'Stack copies of the whole object', 'No address at all'], answer: 0 },
    { id: 't3-05', category: 'Collaboration', q: 'A pointer is a variable that stores:', options: ['The memory address of another variable', 'The return type of a method', 'A copy of every object', 'Only Boolean values'], answer: 0 },
    { id: 't3-06', category: 'Collaboration', q: 'A "part-of" relationship shown with a hollow diamond, where the part can outlive the whole, is:', options: ['Shared aggregation', 'Composition', 'Dependency', 'Inheritance'], answer: 0 },
    { id: 't3-07', category: 'Collaboration', q: 'A relationship shown with a filled diamond, where parts live and die with the whole, is:', options: ['Composition', 'Shared aggregation', 'Dependency', 'Association only'], answer: 0 },
    { id: 't3-08', category: 'Collaboration', q: 'A general structural connection between two classes, drawn as a solid line, is called:', options: ['Association', 'Destruction', 'Compilation', 'Iteration'], answer: 0 },
    { id: 't3-09', category: 'Collaboration', q: 'The weakest, temporary relationship (dashed arrow), often when an object is passed as a parameter, is:', options: ['Dependency', 'Composition', 'Inheritance', 'Generalisation'], answer: 0 },
    { id: 't3-10', category: 'Collaboration', q: 'In UML class diagrams, which symbol indicates private visibility?', options: ['Minus sign (-)', 'Plus sign (+)', 'Hash sign (#)', 'Tilde (~)'], answer: 0 },
    { id: 't3-11', category: 'Collaboration', q: 'Which symbol indicates protected visibility in UML?', options: ['Hash sign (#)', 'Plus sign (+)', 'Minus sign (-)', 'Asterisk (*)'], answer: 0 },
    { id: 't3-12', category: 'Collaboration', q: 'Which symbol indicates public visibility in UML?', options: ['Plus sign (+)', 'Minus sign (-)', 'Hash sign (#)', 'Slash (/)'], answer: 0 },
    { id: 't3-13', category: 'Collaboration', q: 'In UML multiplicity, an asterisk (*) means:', options: ['Zero or more (many)', 'Exactly one', 'Exactly two', 'None allowed'], answer: 0 },
    { id: 't3-14', category: 'Collaboration', q: 'Compared with an array, a List<T> in C# can:', options: ['Be resized dynamically', 'Never store objects', 'Only store integers', 'Bypass encapsulation'], answer: 0 },
    { id: 't3-15', category: 'Collaboration', q: 'Which namespace provides the generic List<T> class in C#?', options: ['System.Collections.Generic', 'System.Drawing', 'System.Audio', 'System.Pointer'], answer: 0 },
    { id: 't3-16', category: 'Collaboration', q: 'A special member that lets an object be accessed using object[index] syntax is an:', options: ['Indexer', 'Interface only', 'Abstract field', 'Enum'], answer: 0 },
    { id: 't3-17', category: 'Collaboration', q: 'If destroying an Employee does not destroy its Address, the relationship is:', options: ['Shared aggregation', 'Composition', 'Inheritance', 'Pure dependency only'], answer: 0 },
    { id: 't3-18', category: 'Collaboration', q: 'Which pair is the clearest example of composition?', options: ['A Book and its Pages', 'A Student and a College', 'A Player and a Die parameter', 'Two unrelated objects'], answer: 0 },

    // ============ Topic 4: Inheritance, abstract classes, interfaces, polymorphism ============
    { id: 't4-01', category: 'Inheritance & Polymorphism', q: 'Inheritance is used to model which kind of relationship?', options: ['is-a', 'temporary-uses', 'has-a only', 'is-built-by'], answer: 0 },
    { id: 't4-02', category: 'Inheritance & Polymorphism', q: 'A class declared with the keyword that prevents direct instantiation is called:', options: ['An abstract class', 'A sealed heap', 'A static pointer', 'A final indexer'], answer: 0 },
    { id: 't4-03', category: 'Inheritance & Polymorphism', q: 'In C++, a pure virtual function is declared as:', options: ['virtual void f() = 0;', 'abstract void f();', 'void f() = new;', 'virtual f(); return 0;'], answer: 0 },
    { id: 't4-04', category: 'Inheritance & Polymorphism', q: 'A type that declares only method signatures and no implementation is an:', options: ['Interface', 'Indexer', 'Object field', 'Enum'], answer: 0 },
    { id: 't4-05', category: 'Inheritance & Polymorphism', q: 'In C#, inheritance or interface implementation is written using which symbol?', options: ['Colon (:)', 'extends keyword', 'arrow (->)', 'ampersand (&)'], answer: 0 },
    { id: 't4-06', category: 'Inheritance & Polymorphism', q: 'In Java, a class inherits from another using which keyword?', options: ['extends', 'implements-only', 'inherits', 'base'], answer: 0 },
    { id: 't4-07', category: 'Inheritance & Polymorphism', q: 'Providing a new implementation for an inherited method with the same signature is called:', options: ['Overriding', 'Overloading', 'Encapsulating', 'Aggregating'], answer: 0 },
    { id: 't4-08', category: 'Inheritance & Polymorphism', q: 'Compile-time polymorphism achieved with several methods of the same name but different parameters is:', options: ['Method overloading', 'Method overriding', 'Data hiding', 'Composition'], answer: 0 },
    { id: 't4-09', category: 'Inheritance & Polymorphism', q: 'Run-time polymorphism in C# is implemented using which pair of keywords?', options: ['virtual and override', 'static and sealed', 'new and delete', 'get and set'], answer: 0 },
    { id: 't4-10', category: 'Inheritance & Polymorphism', q: 'The word "polymorphism" most literally means:', options: ['Many forms', 'One object', 'Hidden data', 'Fixed size'], answer: 0 },
    { id: 't4-11', category: 'Inheritance & Polymorphism', q: 'Which statement about an abstract class is correct?', options: ['It can contain both abstract and implemented members', 'It can always be instantiated', 'It contains only public fields', 'It cannot be inherited'], answer: 0 },
    { id: 't4-12', category: 'Inheritance & Polymorphism', q: 'Under the classic definition used in the slides, an interface contains:', options: ['Only abstract method signatures', 'Constructors and fields', 'Complete method bodies', 'Only heap data'], answer: 0 },
    { id: 't4-13', category: 'Inheritance & Polymorphism', q: 'Generalisation moves from a specific class toward:', options: ['A more general parent class', 'A smaller object', 'The stack only', 'A private field'], answer: 0 },
    { id: 't4-14', category: 'Inheritance & Polymorphism', q: 'Which inherited members can a derived class access directly?', options: ['public and protected members', 'private members only', 'No inherited members', 'Only private constructors'], answer: 0 },
    { id: 't4-15', category: 'Inheritance & Polymorphism', q: 'Iterating over a Shapes array holding Circle, Square and Triangle and calling Area() on each demonstrates:', options: ['Run-time polymorphism (dynamic dispatch)', 'Encapsulation only', 'Method overloading', 'Stack allocation'], answer: 0 },

    // ============ Topic 5: UML class & sequence diagrams ============
    { id: 't5-01', category: 'UML', q: 'Which UML diagram shows the static structure of a system?', options: ['Class diagram', 'Sequence diagram', 'Use case only', 'Pie chart'], answer: 0 },
    { id: 't5-02', category: 'UML', q: 'Which UML diagram shows interactions between objects in time order?', options: ['Sequence diagram', 'Class diagram', 'Object table', 'Flowchart only'], answer: 0 },
    { id: 't5-03', category: 'UML', q: 'In a sequence diagram, the vertical dashed lines under objects are called:', options: ['Lifelines', 'Multiplicities', 'Indexers', 'Stereotypes'], answer: 0 },
    { id: 't5-04', category: 'UML', q: 'The narrow rectangles drawn on a lifeline represent periods of:', options: ['Activation (execution)', 'Deletion only', 'Compilation', 'Encapsulation'], answer: 0 },
    { id: 't5-05', category: 'UML', q: 'In a sequence diagram, a solid filled arrow represents:', options: ['A message or method call', 'A return value', 'Object deletion', 'A class name'], answer: 0 },
    { id: 't5-06', category: 'UML', q: 'In a sequence diagram, a dashed arrow typically represents:', options: ['A return message or value', 'A constructor call', 'A loop start', 'An inheritance link'], answer: 0 },
    { id: 't5-07', category: 'UML', q: 'In UML, the stereotype placed above an abstract class name is:', options: ['<<abstract>>', '<<interface-data>>', '<<return>>', '<<private-only>>'], answer: 0 },
    { id: 't5-08', category: 'UML', q: 'Which combined fragment represents a single optional/conditional behaviour?', options: ['opt', 'loop', 'alt', 'return'], answer: 0 },
    { id: 't5-09', category: 'UML', q: 'Which combined fragment is used for an if/else choice?', options: ['alt', 'opt', 'loop', 'new'], answer: 0 },
    { id: 't5-10', category: 'UML', q: 'Which combined fragment represents repetition?', options: ['loop', 'opt', 'alt', 'lifeline'], answer: 0 },
    { id: 't5-11', category: 'UML', q: 'In a sequence diagram, the deletion of an object is marked by:', options: ['An X at the bottom of its lifeline', 'A filled diamond at the top', 'A plus sign', 'A dashed circle'], answer: 0 },
    { id: 't5-12', category: 'UML', q: 'UML is primarily a language for:', options: ['Modeling, visualizing and communicating a software design', 'Compiling C++ to machine code', 'Allocating the stack', 'Replacing unit tests'], answer: 0 }
  ];
});
