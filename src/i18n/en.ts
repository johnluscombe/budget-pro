/** English source messages shared by the renderer and Electron main process. */
export default {
    common: {
        actions: {
            cancel: "Cancel",
            save: "Save",
            delete: "Delete",
            editNamedItem: "Edit {name}",
            deleteNamedItem: "Delete {name}",
            optionsFor: "Options for {name}"
        },
        fields: {
            group: "Group",
            payee: "Payee",
            category: "Category",
            date: "Date",
            note: "Note",
            income: "Income",
            plannedAmount: "Planned amount",
            amount: "Amount",
            groupName: "Group name",
            categoryName: "Category name",
            budgetName: "Budget name"
        },
        accessibility: {
            closeDialog: "Close dialog",
            dismissError: "Dismiss error",
            dismissNotification: "Dismiss notification",
            mainNavigation: "Main navigation",
            budgetProHome: "Budget Pro home"
        }
    },
    navigation: {
        workspaceHeading: "YOUR WORKSPACE",
        personalWorkspace: "Personal workspace",
        budgetOverview: "Budget overview",
        transactions: "Transactions",
        filesHeading: "BUDGET FILES",
        myWorkspace: "My workspace"
    },
    files: {
        actions: {
            newBudget: "New budget",
            openBudget: "Open budget",
            saveBudget: "Save budget",
            saveAs: "Save as…",
            renameBudget: "Rename budget",
            moreFileOptions: "More file options",
            createBudget: "Create budget"
        },
        status: {
            unsavedChanges: "Unsaved changes",
            allChangesSaved: "All changes saved",
            sampleBudget: "Sample budget",
            savedWithNewerChanges:
                "Budget saved. You have newer changes to save.",
            saved: "Budget saved. Everything is up to date.",
            opened: "Budget opened.",
            created: "Your new budget is ready. Start with your monthly income."
        },
        errors: {
            save: "Unable to save your budget.",
            open: "Unable to open this budget file.",
            restore:
                "Your previous budget could not be reopened. Use Open to choose a file.",
            restoreFile:
                "Could not reopen {filename}. The file may have moved or changed. Use Open budget to choose it again.",
            notFound: "The budget file {filename} could not be found.",
            invalidFile:
                "Could not open {filename}. Choose a valid Budget Pro file.",
            write: "Could not save {filename}. Check the folder permissions and available disk space.",
            readRecent:
                "Could not read the previous budget location. Use Open budget to choose a file.",
            invalidRecentPath: "Invalid previous file location",
            invalidRecent:
                "The previous budget location is unreadable. Use Open budget to choose a file.",
            fileTooLarge: "Choose a budget JSON file smaller than 20 MB.",
            budgetTooLarge:
                "This budget is larger than the supported 20 MB file size.",
            rememberWarning:
                "The budget file is safe, but its location could not be remembered. Open it manually next time."
        }
    },
    budget: {
        page: {
            eyebrow: "A LITTLE PLANNING. A LOT MORE PEACE OF MIND.",
            subtitle: "Make room for what matters.",
            previousMonth: "Previous month",
            nextMonth: "Next month",
            tab: "Your budget",
            emptyTitle: "A budget that fits your life",
            emptyDescription:
                "Add your first group, then create categories inside it.",
            emptyAction: "Add your first group",
            monthNote:
                "Plans and expenses belong to the selected month. Category names are shared across months.",
            footer: "A little more intentional, every month.",
            sampleNote: "Sample data · Create a new budget to start fresh",
            privacyTitle: "Your money. Your data.",
            privacyDescription:
                "Budget files stay on your device. No account needed.",
            privacyCaption: "Private by design. Saved locally."
        },
        allocation: {
            overIncome: "planned beyond your income",
            fullyAssigned: "left to assign. Every dollar has a purpose.",
            remaining: "left to assign to your categories"
        },
        groups: {
            addGroup: "Add group",
            renameGroup: "Rename group",
            deleteGroup: "Delete group"
        },
        categories: {
            planned: "Planned",
            spent: "Spent",
            available: "Available",
            plan: "Plan {name}",
            editCategory: "Edit category",
            deleteCategory: "Delete category",
            addCategoryTo: "Add category to {group}",
            addCategory: "Add category"
        }
    },
    summary: {
        label: "Monthly summary",
        monthlyIncome: "Monthly income",
        editMonthlyIncome: "Edit monthly income",
        incomeCaption: "Your starting point this month",
        totalPlanned: "Total planned",
        categoryCount: "Across {count} budget categories",
        spentSoFar: "Spent so far",
        transactionCount: "{count} transactions this month",
        leftThisMonth: "Left this month",
        overspent: "Spending has exceeded your income",
        remainingCaption: "A little breathing room"
    },
    insights: {
        spending: {
            title: "Spending breakdown",
            description: "Where this month's money went",
            accessibleDescription: "Total spent {amount}. {breakdown}",
            totalSpentLabel: "TOTAL SPENT",
            categorySpending: "{category}: {amount}",
            empty: "Add a group to see your breakdown."
        },
        pace: {
            title: "Your monthly pace",
            caption: "of income spent",
            noIncome: "Add your income, then give every dollar a job.",
            overIncome:
                "Your plan exceeds your income. Adjust a few categories to find your balance.",
            tip: "Small, thoughtful choices today make space for your plans tomorrow."
        }
    },
    transactions: {
        addExpense: "Add expense",
        title: "Monthly activity",
        description: "A clear picture of where your money goes.",
        search: "Search transactions",
        editLabel: "Edit expense {payee}",
        deleteLabel: "Delete expense {payee}",
        noMatches: "No matching transactions",
        emptyTitle: "A fresh start for this month",
        noMatchesDescription: "Try another payee or category name.",
        emptyDescription: "Add an expense to start tracking your spending."
    },
    editor: {
        titles: {
            planCategory: "Plan category",
            editExpense: "Edit expense"
        },
        actions: {
            updateName: "Update name",
            updateIncome: "Update income",
            updateGroup: "Update group",
            updateCategory: "Update category",
            updatePlan: "Update plan",
            updateExpense: "Update expense"
        },
        descriptions: {
            income: "How much income are you planning for {month}?",
            plan: "Set aside money for {category} in {month}.",
            expense:
                "Record spending for {month}. It will update your available amounts.",
            newBudget:
                "A fresh start. Your budget includes a few starter categories that you can make your own.",
            renameBudget: "Give this budget a name that feels like you.",
            group: "Keep related categories together, in a way that makes sense to you.",
            category: "Create a home for the things you spend on or save for."
        },
        validation: {
            nameRequired: "Please enter a name",
            groupRequired: "Choose a group.",
            payeeRequired: "Please enter a payee",
            categoryRequired: "Choose a category",
            dateInMonth: "Choose a date in the selected month",
            positiveAmount: "Enter an amount greater than zero",
            decimalAmount:
                "Enter a positive amount with up to 2 decimal places",
            invalidEntry: "Please check your entries.",
            deleteFailed: "Unable to delete this item."
        }
    },
    dialogs: {
        unsavedChanges: {
            title: "Save your changes?",
            description:
                "You have unsaved changes to {name}. Save them before continuing.",
            keepEditing: "Keep editing",
            discardChanges: "Discard changes",
            saveAndContinue: "Save and continue"
        },
        delete: {
            title: "Delete {name}?",
            expenseDescription:
                "Remove {payee} from this month? Your available amount will be updated.",
            categoryDescription:
                "This removes this category and its planned amounts from every month. Categories with recorded expenses must be kept to preserve your history.",
            groupDescription:
                "This removes the group, its categories, and all their planned amounts. Groups with recorded expenses must be kept to preserve your history.",
            expenseTitle: "Delete this expense?"
        }
    },
    defaults: {
        budgets: {
            sample: "Personal budget",
            unnamed: "My budget"
        },
        groups: {
            essentials: "Essentials",
            lifestyle: "Lifestyle",
            futureYou: "Future you"
        },
        categories: {
            rentMortgage: "Rent & mortgage",
            groceries: "Groceries",
            utilities: "Utilities",
            transportation: "Transportation",
            diningOut: "Dining out",
            shopping: "Shopping",
            entertainment: "Entertainment",
            subscriptions: "Subscriptions",
            emergencyFund: "Emergency fund",
            travel: "Travel",
            investments: "Investments"
        },
        samplePayees: {
            monthlyRent: "Monthly rent",
            wholeFoodsMarket: "Whole Foods Market",
            traderJoes: "Trader Joe’s",
            neighborhoodMarket: "Neighborhood market",
            electricWater: "Electric & water",
            internet: "Internet",
            gasStation: "Gas station",
            transitPass: "Transit pass",
            sundayBrunch: "Sunday brunch",
            dinnerWithFriends: "Dinner with friends",
            aLittleSomething: "A little something",
            movieNight: "Movie night",
            monthlySubscriptions: "Monthly subscriptions",
            savingsTransfer: "Savings transfer",
            travelFund: "Travel fund",
            investmentContribution: "Investment contribution"
        }
    },
    validation: {
        date: {
            invalidDate: "Choose a valid date.",
            invalidMonth: "Choose a valid month.",
            monthOutOfRange: "Month is out of range."
        },
        money: {
            invalidAmount:
                "Enter a positive amount with up to two decimal places.",
            amountTooLarge: "This amount is too large."
        },
        budget: {
            nameRequired: "Give your budget a name.",
            categoryHasTransactions:
                "This category has transactions. Remove or move its transactions first.",
            categoryNotFound: "Category not found.",
            groupNotFound: "Group not found.",
            unsupportedVersion: "This budget file version is not supported.",
            unsupportedCurrency: "This budget must use USD.",
            objectRequired: "Invalid budget: {field} must be an object.",
            textRequired: "Invalid budget: {field} must be text.",
            integerCentsRequired:
                "Invalid budget: {field} must be {requirement} integer cents.",
            listRequired: "Invalid budget: {field} must be a list.",
            duplicateOrReservedId:
                "Invalid budget: duplicate or reserved {field}.",
            invalidMonth: "Invalid budget: month must use YYYY-MM.",
            allocationCategoryMissing:
                "Invalid budget: allocation category does not exist.",
            transactionCategoryMissing:
                "Invalid budget: transaction category does not exist.",
            invalidTransactionDate:
                "Invalid budget: transaction date must be a real date in its month.",
            totalTooLarge: "Invalid budget: monthly total is too large."
        },
        fields: {
            documentId: "document ID",
            groupId: "group ID",
            groupName: "group name",
            groupIcon: "group icon",
            categoryId: "category ID",
            categoryName: "category name",
            transactionCategory: "transaction category",
            transactionDate: "transaction date",
            transactionId: "transaction ID",
            transactionAmount: "transaction amount",
            budgetName: "budget name"
        }
    },
    desktop: {
        menu: {
            file: "File",
            view: "View",
            openBudget: "Open budget…",
            saveBudgetAs: "Save budget as…"
        },
        dialogs: {
            fileFilter: "Budget Pro files",
            closeTitle: "Save changes to your budget?",
            closeMessage: "Your budget has unsaved changes.",
            closeDetail: "Save your changes before closing Budget Pro.",
            discard: "Don’t save"
        },
        errors: {
            unauthorizedFileAccess:
                "Budget file access is restricted to the application window.",
            chooseSaveDestination:
                "Choose the destination using Save budget as."
        }
    }
} as const;
